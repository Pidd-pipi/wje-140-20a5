import { Compensation } from '../types/interfaces';

export interface AtomicStep {
  execute: () => Compensation | void;
}

/**
 * 顺序执行业务步骤；任一步骤抛错则按逆序执行已注册的补偿动作，
 * 保证跨服务状态变更同成同败，不留下部分记录。
 */
export async function runAtomically(steps: AtomicStep[]): Promise<void> {
  const compensations: Compensation[] = [];
  try {
    for (const step of steps) {
      const compensation = await step.execute();
      if (compensation) compensations.unshift(compensation);
    }
  } catch (error) {
    for (const compensate of compensations) {
      try {
        compensate();
      } catch (rollbackError) {
        // 补偿阶段只能尽力而为，原始失败原因对调用方更重要
      }
    }
    throw error;
  }
}
