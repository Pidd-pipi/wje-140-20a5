import { Injectable } from '@nestjs/common';
import { VehicleStatus } from '../types/enums';
@Injectable()
export class VehicleService {
  private rows = [{ id: 1, plateNo: '沪A-7821', vehicleType: 'Refrigerated', brandModel: '东风天锦 KR', purchaseDate: '2023-03-12', insuranceExpireDate: '2026-09-30', inspectionExpireDate: '2026-11-20', status: 'Available', mileage: 88210, tankCapacity: 380, dailyFixedCost: 260, maintenanceRecordId: null as number | null }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { maintenanceRecordId: null, ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }
  isInMaintenance(id: number) { const row: any = this.findOne(id); return !!row && row.status === VehicleStatus.Maintenance; }
  markMaintenance(id: number, recordId: number) {
    const row: any = this.findOne(id);
    if (!row || row.status !== VehicleStatus.Available) return null;
    row.status = VehicleStatus.Maintenance;
    row.maintenanceRecordId = recordId;
    return row;
  }
  releaseMaintenance(id: number, recordId: number) {
    const row: any = this.findOne(id);
    if (!row || row.status !== VehicleStatus.Maintenance || row.maintenanceRecordId !== recordId) return false;
    row.status = VehicleStatus.Available;
    row.maintenanceRecordId = null;
    return true;
  }
  syncMileage(id: number, mileage: number) {
    const row: any = this.findOne(id);
    if (!row) return null;
    if (typeof mileage === 'number' && Number.isFinite(mileage) && mileage > row.mileage) row.mileage = mileage;
    return row;
  }
}
