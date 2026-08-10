import 'server-only';

import { Config, KnowledgeClient } from 'coze-coding-dev-sdk';

/**
 * 导师知识库（仅服务端）。
 *
 * 三份扫描版 PDF 已导入数据集 wujian_knowledge：
 * 扫描件没有文字层，知识库分块是页面图片而非文本，
 * 因此检索结果以「页面扫描图」形式随用户消息交给具备图像理解能力的模型阅读。
 *
 * 本文件只准被服务端代码 import（同 rubrics.ts 的纪律）——
 * 客户端不需要知道知识库的存在，更不能拿到数据集名与 doc_id。
 */

export const KNOWLEDGE_DATASET = 'wujian_knowledge';

/** doc_id → 书目，用于让导师说明资料出处 */
const DOC_TITLES: Record<string, string> = {
  '7671124193089634345': '《长沙走马楼三国吴简的保护与整理》（保护修复报告）',
  '7671124410329350186': '《长沙走马楼三国吴简》语词汇释',
  '7671124003049799734': '《长沙走马楼三国孙吴简牍官文书整理与研究》',
};

export interface RetrievedPage {
  /** 页面扫描图的签名 URL（检索时即时签发，短时效，随取随用） */
  imageUrl: string;
  /** 出自哪本书 */
  book: string;
  score: number;
}

const IMG_RE = /!\[img\]\((https?:\/\/[^)\s]+)\)/;

/**
 * 用学习者的发问检索知识库，返回相关书页扫描图。
 * 任何失败（无凭据、网络、服务异常）都返回空数组——
 * 知识库是增强项，不许因为它挂掉导师对话。
 */
export async function retrieveReferencePages(
  query: string,
  customHeaders?: Record<string, string>,
  topK = 4,
): Promise<RetrievedPage[]> {
  const text = query.trim();
  if (text.length < 2) return [];
  try {
    const client = new KnowledgeClient(new Config(), customHeaders);
    const res = await client.search(text, [KNOWLEDGE_DATASET], topK, 0.3);
    if (res.code !== 0) {
      console.warn('[wujian] knowledge search failed:', res.msg);
      return [];
    }
    const pages: RetrievedPage[] = [];
    for (const chunk of res.chunks) {
      const m = chunk.content.match(IMG_RE);
      if (!m) continue; // 只保留页面图分块；文本分块暂不出现，出现了也先不混用
      pages.push({
        imageUrl: m[1],
        book: (chunk.doc_id && DOC_TITLES[chunk.doc_id]) || '参考书籍（扫描页）',
        score: chunk.score,
      });
    }
    return pages.slice(0, topK);
  } catch (err) {
    console.warn('[wujian] knowledge search error:', err);
    return [];
  }
}
