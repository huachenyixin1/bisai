// src/app.ts
import { RuntimeConfig } from '@umijs/max';

export async function getInitialState(): Promise<{ name: string }> {
  return { name: '@umijs/max' };
}

export const layout: RuntimeConfig['layout'] = () => {
  return {
    logo: false, // 你已设置为 false，保持不变
    title: '老年人评估师大赛',
    menu: {
      locale: false,
      defaultOpenAll: true, // 展开所有菜单项
    },
  };
};