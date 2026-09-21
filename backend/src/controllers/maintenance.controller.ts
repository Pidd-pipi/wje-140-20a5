import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompleteMaintenancePayload, MaintenanceService } from '../services/maintenance.service';

@Controller('maintenance-records')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(Number(id)); }

  /** 通用建档（默认 Scheduled），不占用车辆。 */
  @Post() create(@Body() payload: any) { return this.service.create(payload); }

  /** 开始维保：存在已分派/进行中调度单则整次拒绝，否则车辆置为维保中。 */
  @Post('start') start(@Body() payload: any) { return this.service.start(payload); }

  /** 维保完工：车辆仍被当前记录占用时恢复可用，同步里程与费用，失败整体回滚。 */
  @Post(':id/complete') complete(@Param('id') id: string, @Body() payload: CompleteMaintenancePayload) {
    return this.service.complete(Number(id), payload);
  }
}
