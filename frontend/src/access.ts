// src/access.ts
export default (initialState: API.UserInfo) => {
  const canSeeAdmin = !!(initialState && initialState.name !== 'dontHaveAccess');
  return {
    canSeeAdmin,
    canSeeExaminee: canSeeAdmin, // 选手管理
    canSeeJudge: canSeeAdmin, // 考官管理
    canSeeEvalmanage: canSeeAdmin, // 评估对象
  };
};