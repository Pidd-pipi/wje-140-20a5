# 车队调度与维护 RESTful API 服务

## Docker 快速启动

```bash
docker compose up -d
```

Swagger 文档：http://localhost:19210/api-docs  
健康检查：http://localhost:19210/api/health

## 项目介绍

面向物流公司内部管理系统的后端 API，覆盖车辆生命周期、司机、调度、油耗、维保和费用核算。

## API 功能列表

- /api/vehicles：车辆管理。
- /api/drivers：司机管理。
- /api/dispatch-orders：调度派单与状态流转。
- /api/maintenance-records：维保管理。
  - POST /api/maintenance-records/start：开始维保；车辆存在已分派/进行中调度单时整次拒绝，无冲突则车辆置为维保中。
  - POST /api/maintenance-records/:id/complete：维保完工；仅车辆仍由当前记录占用时恢复可用，同步里程与月度费用，失败整体回滚。
  - 维保中的车辆不能生成 Assigned/InProgress 可执行调度单，Draft 草稿仍可创建。
- /api/fuel-records：油耗记录。
- /api/cost-summaries：费用汇总与利润核算。

## 本地开发

```bash
cd backend
npm install
npm run start:dev
```

## 技术栈

| 分类 | 技术 |
| --- | --- |
| 后端 | NestJS + TypeScript |
| ORM | TypeORM |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 7 |
| 认证 | JWT |
| 文档 | Swagger |

## 目录结构

```
backend/src/
├── routes/
├── controllers/
├── services/
├── models/
├── middlewares/
├── types/
├── utils/
├── config/
└── database/
```

## 枚举定义位置

- VehicleStatus：backend/src/types/enums.ts；backend/src/models/vehicle.entity.ts；backend/src/services/vehicle.service.ts
- DispatchStatus：backend/src/types/enums.ts；backend/src/models/dispatchOrder.entity.ts；backend/src/services/dispatch.service.ts
- MaintenanceStatus（Scheduled/InProgress/Completed）：backend/src/types/enums.ts；backend/src/services/maintenance.service.ts
- MaintenanceType：backend/src/types/enums.ts；backend/src/models/maintenanceRecord.entity.ts；backend/src/services/maintenance.service.ts
- DriverStatus：backend/src/types/enums.ts；backend/src/models/driver.entity.ts；backend/src/services/driver.service.ts
- PaymentMethod：backend/src/types/enums.ts；backend/src/models/fuelRecord.entity.ts；backend/src/services/fuel.service.ts

## License

MIT
