import { ConflictException, Injectable } from '@nestjs/common';
import { DispatchStatus } from '../types/enums';
import { VehicleService } from './vehicle.service';
const EXECUTABLE_STATUSES = [DispatchStatus.Assigned, DispatchStatus.InProgress];
@Injectable()
export class DispatchService {
  constructor(private readonly vehicleService: VehicleService) {}
  private rows = [{ id: 1, orderNo: 'DSP-20260612-0001', vehicleId: 1, driverId: 1, origin: '上海青浦仓', destination: '杭州萧山仓', planDepartAt: '2026-06-12 09:00', planArriveAt: '2026-06-12 13:30', cargo: '冷链食品', weight: 8200, volume: 42, freight: 7200, estimatedFuelCost: 1500, estimatedTollCost: 420, status: 'Assigned', profit: 4180 }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  hasActiveOrdersForVehicle(vehicleId: number) {
    return this.rows.some((item: any) => item.vehicleId === vehicleId && EXECUTABLE_STATUSES.includes(item.status));
  }
  create(payload: any) {
    const status = payload.status ?? DispatchStatus.Draft;
    if (EXECUTABLE_STATUSES.includes(status) && this.vehicleService.isInMaintenance(payload.vehicleId)) {
      throw new ConflictException('车辆维保中，不能生成可执行调度单，仅可保留草稿');
    }
    const row = { ...payload, status, id: this.rows.length + 1 };
    this.rows.push(row);
    return row;
  }
}
