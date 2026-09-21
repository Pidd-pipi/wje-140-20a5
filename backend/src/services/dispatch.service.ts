import { ConflictException, Injectable } from '@nestjs/common';
import { DispatchStatus } from '../types/enums';
import { VehicleService } from './vehicle.service';

@Injectable()
export class DispatchService {
  private rows: any[] = [{ id: 1, orderNo: 'DSP-20260612-0001', vehicleId: 1, driverId: 1, origin: '上海青浦仓', destination: '杭州萧山仓', planDepartAt: '2026-06-12 09:00', planArriveAt: '2026-06-12 13:30', cargo: '冷链食品', weight: 8200, volume: 42, freight: 7200, estimatedFuelCost: 1500, estimatedTollCost: 420, status: DispatchStatus.Assigned, profit: 4180 }];

  /** 已分派或进行中的调度单会占用车辆，阻断维保开始。 */
  private static readonly ACTIVE_STATUSES = [DispatchStatus.Assigned, DispatchStatus.InProgress];
  /** 可执行调度单：维保中的车辆不允许生成。 */
  private static readonly EXECUTABLE_STATUSES = [DispatchStatus.Assigned, DispatchStatus.InProgress];

  constructor(private readonly vehicleService: VehicleService) {}

  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }

  create(payload: any) {
    const status = payload.status ?? DispatchStatus.Draft;
    if (
      DispatchService.EXECUTABLE_STATUSES.includes(status) &&
      this.vehicleService.isInMaintenance(payload.vehicleId)
    ) {
      throw new ConflictException(`车辆 ${payload.vehicleId} 维保中，无法生成状态为 ${status} 的可执行调度单，可先保存为草稿`);
    }
    const row = { ...payload, status, id: this.rows.length + 1 };
    this.rows.push(row);
    return row;
  }

  findActiveByVehicle(vehicleId: number) {
    return this.rows.find(
      (item: any) => item.vehicleId === vehicleId && DispatchService.ACTIVE_STATUSES.includes(item.status)
    );
  }
}
