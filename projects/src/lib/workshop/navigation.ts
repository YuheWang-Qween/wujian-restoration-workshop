/**
 * 明确进入或返回学习界面时携带学生视角标记。
 * 裸根路径仍供登录落地使用，让教师按原规则进入学情分析。
 * 此标记只选择首页界面，不改变用户角色或任何接口鉴权。
 */
export const WORKSHOP_HOME_HREF = '/?view=student';
export const EXHIBITION_HOME_HREF = '/?view=student&tab=exhibition';
