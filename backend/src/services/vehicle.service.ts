import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Compensation } from '../types/interfaces';
import { VehicleStatus } from '../types/enums';

@Injectable()
export class VehicleService {
  private rows: any[] = [{ id: 1, plateNo: '沪A-7821', vehicleType: 'Refrigerated', brandModel: '东风天锦 KR', purchaseDate: '2023-03-12', insuranceExpireDate: '2026-09-30', inspectionExpireDate: '2026-11-20', status: VehicleStatus.Available, mileage: 88210, tankCapacity: 380, dailyFixedCost: 260 }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }

  getRequired(id: number) {
    const vehicle = this.findOne(id);
    if (!vehicle) throw new NotFoundException(`车辆 ${id} 不存在`);
    return vehicle;
  }

  isInMaintenance(vehicleId: number) {
    return this.findOne(vehicleId)?.status === VehicleStatus.Maintenance;
  }

  /** 仅当车辆当前状态匹配 expectedStatus 时才切换为 nextStatus，返回补偿动作。 */
  transitionStatus(vehicleId: number, expectedStatus: VehicleStatus, nextStatus: VehicleStatus): Compensation {
    const vehicle = this.getRequired(vehicleId);
    if (vehicle.status !== expectedStatus) {
      throw new ConflictException(`车辆 ${vehicleId} 当前状态为 ${vehicle.status}，无法从 ${expectedStatus} 变更为 ${nextStatus}`);
    }
    vehicle.status = nextStatus;
    return () => { vehicle.status = expectedStatus; };
  }

  /** 仅当车辆仍被当前维保记录占用（维保中）时才恢复可用并同步里程，返回补偿动作。 */
  restoreFromMaintenance(vehicleId: number, mileage: number): Compensation {
    const vehicle = this.getRequired(vehicleId);
    if (vehicle.status !== VehicleStatus.Maintenance) {
      throw new ConflictException(`车辆 ${vehicleId} 当前未处于维保中，完工操作被拒绝`);
    }
    const previousMileage = vehicle.mileage;
    if (!Number.isFinite(mileage) || mileage < previousMileage) {
      throw new BadRequestException(`完工里程不能小于当前里程 ${previousMileage}`);
    }
    vehicle.status = VehicleStatus.Available;
    vehicle.mileage = mileage;
    return () => {
      vehicle.status = VehicleStatus.Maintenance;
      vehicle.mileage = previousMileage;
    };
  }
}
