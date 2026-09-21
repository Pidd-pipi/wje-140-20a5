import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DispatchStatus, MaintenanceStatus, VehicleStatus } from '../types/enums';
import { Compensation } from '../types/interfaces';
import { runAtomically } from '../utils/atomic';
import { CostService } from './cost.service';
import { DispatchService } from './dispatch.service';
import { VehicleService } from './vehicle.service';

export interface CompleteMaintenancePayload {
  /** 维保时车辆的完工里程，同步到车辆台账 */
  mileage: number;
  /** 实际维保费用，缺省使用建档费用 */
  cost?: number;
  /** 费用归集月份，缺省取维修日期所在月 */
  month?: string;
}

@Injectable()
export class MaintenanceService {
  private rows: any[] = [{ id: 1, vehicleId: 1, maintenanceType: 'Routine', item: '机油与制动检查', cost: 2100, vendor: '青浦维保站', date: '2026-06-06', nextMileage: 93000, nextDate: '2026-09-06', status: MaintenanceStatus.Completed }];

  constructor(
    private readonly vehicleService: VehicleService,
    private readonly dispatchService: DispatchService,
    private readonly costService: CostService
  ) {}

  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }

  /** 通用建档：不触发占车，默认进入已排期状态；开始维保请走 start。 */
  create(payload: any) {
    const row = { ...payload, status: payload.status ?? MaintenanceStatus.Scheduled, id: this.rows.length + 1 };
    this.rows.push(row);
    return row;
  }

  /**
   * 开始维保：
   * 1. 车辆存在已分派（Assigned）或进行中（InProgress）的调度单 → 整次拒绝，不落任何记录；
   * 2. 无冲突才创建进行中维保记录并把车辆置为维保中；
   * 3. 车辆状态更新失败必须补偿掉刚创建的维保记录，反之亦然。
   */
  async start(payload: any) {
    const vehicleId = Number(payload.vehicleId);
    if (!Number.isInteger(vehicleId)) throw new BadRequestException('vehicleId 非法');
    this.vehicleService.getRequired(vehicleId);

    const conflict = this.dispatchService.findActiveByVehicle(vehicleId);
    if (conflict) {
      throw new ConflictException(
        `车辆 ${vehicleId} 存在${conflict.status === DispatchStatus.InProgress ? '进行中' : '已分派'}调度单 ${conflict.orderNo ?? conflict.id}，整次拒绝开始维保`
      );
    }
    if (this.vehicleService.isInMaintenance(vehicleId)) {
      throw new ConflictException(`车辆 ${vehicleId} 已处于维保中，不能重复开始维保`);
    }

    const record = { ...payload, vehicleId, status: MaintenanceStatus.InProgress, id: null as number | null };
    await runAtomically([
      {
        execute: () => {
          record.id = this.rows.length + 1;
          this.rows.push(record);
          return () => {
            const index = this.rows.indexOf(record);
            if (index >= 0) this.rows.splice(index, 1);
            record.id = null;
          };
        }
      },
      {
        execute: () => this.vehicleService.transitionStatus(
          vehicleId,
          VehicleStatus.Available,
          VehicleStatus.Maintenance
        )
      }
    ]);
    return record;
  }

  /**
   * 维保完工：
   * 1. 仅在车辆仍由当前维保记录占用（维保中）时才恢复可用；
   * 2. 同步车辆里程与月度维保费用；
   * 3. 记录状态、车辆状态、里程、费用任一步失败均整体回滚，不留部分记录。
   */
  async complete(id: number, payload: CompleteMaintenancePayload) {
    const record = this.findOne(id);
    if (!record) throw new NotFoundException(`维保记录 ${id} 不存在`);
    if (record.status !== MaintenanceStatus.InProgress) {
      throw new ConflictException(`维保记录 ${id} 当前状态为 ${record.status}，不能完工`);
    }
    this.vehicleService.getRequired(record.vehicleId);

    const mileage = Number(payload.mileage);
    if (!Number.isFinite(mileage)) throw new BadRequestException('完工里程必填且必须为数字');
    const cost = payload.cost !== undefined ? Number(payload.cost) : Number(record.cost ?? 0);
    if (!Number.isFinite(cost) || cost < 0) throw new BadRequestException('维保费用非法');
    const month = payload.month ?? this.resolveMonth(record.date);

    await runAtomically([
      {
        execute: () => {
          const previousStatus = record.status;
          const previousCost = record.cost;
          record.status = MaintenanceStatus.Completed;
          if (payload.cost !== undefined) record.cost = cost;
          return () => {
            record.status = previousStatus;
            record.cost = previousCost;
          };
        }
      },
      {
        execute: () => this.vehicleService.restoreFromMaintenance(record.vehicleId, mileage)
      },
      {
        execute: () => this.costService.applyMaintenanceCost(record.vehicleId, month, cost)
      }
    ]);
    return record;
  }

  private resolveMonth(date: string | undefined): string {
    if (typeof date === 'string' && /^\d{4}-\d{2}/.test(date)) return date.slice(0, 7);
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
