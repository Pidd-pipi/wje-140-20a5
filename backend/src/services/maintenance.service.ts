import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { VehicleService } from './vehicle.service';
@Injectable()
export class MaintenanceService {
  constructor(private readonly vehicleService: VehicleService, private readonly dispatchService: DispatchService) {}
  private rows = [
    { id: 1, vehicleId: 1, maintenanceType: 'Routine', item: '机油与制动检查', cost: 2100, vendor: '青浦维保站', date: '2026-06-06', nextMileage: 93000, nextDate: '2026-09-06', status: 'Completed' },
    { id: 2, vehicleId: 1, maintenanceType: 'Inspection', item: '年检前整车检查', cost: 800, vendor: '青浦维保站', date: '2026-09-25', nextMileage: 95000, nextDate: '2026-12-25', status: 'Scheduled' }
  ];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { status: 'Scheduled', ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }
  start(id: number) {
    const record: any = this.findOne(id);
    if (!record) throw new NotFoundException('维保记录不存在');
    if (record.status !== 'Scheduled') throw new ConflictException('仅待执行的维保记录可以开始');
    if (this.dispatchService.hasActiveOrdersForVehicle(record.vehicleId)) {
      throw new ConflictException('车辆存在已分派或进行中的调度单，整次拒绝开始维保');
    }
    const vehicle = this.vehicleService.markMaintenance(record.vehicleId, record.id);
    if (!vehicle) throw new ConflictException('车辆当前状态不允许开始维保');
    record.status = 'InProgress';
    return record;
  }
  complete(id: number, payload: any) {
    const record: any = this.findOne(id);
    if (!record) throw new NotFoundException('维保记录不存在');
    if (record.status !== 'InProgress') throw new ConflictException('仅进行中的维保记录可以完成');
    const vehicle: any = this.vehicleService.findOne(record.vehicleId);
    const recordSnapshot = { status: record.status, cost: record.cost };
    const vehicleSnapshot = vehicle ? { status: vehicle.status, mileage: vehicle.mileage, maintenanceRecordId: vehicle.maintenanceRecordId } : null;
    try {
      if (payload?.cost !== undefined) record.cost = payload.cost;
      if (vehicle && payload?.mileage !== undefined) this.vehicleService.syncMileage(vehicle.id, Number(payload.mileage));
      const occupiedByRecord = !!vehicle && vehicle.maintenanceRecordId === record.id;
      if (occupiedByRecord && !this.vehicleService.releaseMaintenance(vehicle.id, record.id)) {
        throw new ConflictException('车辆状态恢复失败');
      }
      record.status = 'Completed';
    } catch (err) {
      Object.assign(record, recordSnapshot);
      if (vehicle && vehicleSnapshot) Object.assign(vehicle, vehicleSnapshot);
      throw err;
    }
    return record;
  }
}
