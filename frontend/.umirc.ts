import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '老年人评估师大赛',
    logo: false,
  },
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      component: './Login',
      layout: false,
    },
    {
      path: '/admin',
      name: '管理',
      routes: [
        {
          path: '/admin/examinee',
          name: '选手管理',
          component: './admin/examinee',
        },
        {
          path: '/admin/judge',
          name: '考官管理',
          component: './admin/judge',
        },
        {
          path: '/admin/evalmanage',
          name: '评估对象',
          component: './admin/evalmanage',
        },
      ],
    },
    {
      path: '/contestant',
      component: './contestant/exam',
      layout: false,
    },
    {
      path: '/contestant/prepare',
      component: './contestant/prepare',
      layout: false,
    },
    {
      path: '/judge/examinee_list',
      component: './judge/examinee_list',
      layout: false,
    },
    {
      path: '/judge/score_record',
      component: './judge/score_record',
      layout: false,
    },
    {
      path: '/judge/examinee_scores',
      component: './judge/examinee_scores',
      layout: false,
    },
    
  ],
  npmClient: 'pnpm',
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
});