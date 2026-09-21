import { Injectable } from '@nestjs/common';
import { Compensation } from '../types/interfaces';
import { calculateTotalCost } from '../utils/costCalculator';

@Injectable()
export class CostService {
  private rows: any[] = [{ id: 1, vehicleId: 1, month: '2026-06', fuelTotal: 1776, maintenanceTotal: 2100, tollTotal: 420, laborTotal: 2500, fixedCost: 7800, totalCost: 14596, totalRevenue: 22600, profit: 8004 }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }

  /**
   * 将一笔维保费用同步到指定车辆的月度汇总：有则更新，无则新建，
   * 同步重算总成本与利润，并返回补偿动作（新建则移除，更新则还原快照）。
   */
  applyMaintenanceCost(vehicleId: number, month: string, cost: number): Compensation {
    let summary = this.rows.find((item: any) => item.vehicleId === vehicleId && item.month === month);
    if (summary) {
      const snapshot = { ...summary };
      summary.maintenanceTotal = cost;
      summary.totalCost = calculateTotalCost(summary.fuelTotal, summary.maintenanceTotal, summary.tollTotal, summary.laborTotal, summary.fixedCost);
      summary.profit = summary.totalRevenue - summary.totalCost;
      return () => Object.assign(summary, snapshot);
    }

    const row = {
      id: this.rows.length + 1,
      vehicleId,
      month,
      fuelTotal: 0,
      maintenanceTotal: cost,
      tollTotal: 0,
      laborTotal: 0,
      fixedCost: 0,
      totalCost: cost,
      totalRevenue: 0,
      profit: -cost
    };
    this.rows.push(row);
    return () => {
      const index = this.rows.indexOf(row);
      if (index >= 0) this.rows.splice(index, 1);
    };
  }
}
