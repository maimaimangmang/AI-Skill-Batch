export const skillCategories = [
  { id: 'images', title: '图片与设计', description: '插画、配图、商品图与视觉素材', representative: 'text-image-v1',
    prepare: '写清画面主体、用途、风格和比例；需要参考图的工作流还要准备自己的图片。',
    check: '先检查主体细节、画面文字和尺寸。人物、产品外观与商标尤其需要人工复核。',
    batch: '每行放一个画面需求，先试一行确认效果，再增加不同场景或风格的任务。',
    boundary: '不同图片工作流的输入方式不同：文生图使用提示词，复刻或套图可能需要上传参考图。请以所选工作流字段为准。' },
  { id: 'video', title: '视频与脚本', description: '短视频、分镜、口播与视频素材', representative: '01a06ef1-d7a0-7b12-9e46-09879a52b532',
    prepare: '准备主题或商品资料，明确面向谁、发布平台、时长与希望表达的重点。',
    check: '检查分镜连贯性、主体一致性、字幕、声音和时长；下载后完整播放一次。',
    batch: '先验证一个主题，再按行组织不同主题或卖点。视频任务的执行时间和费用以具体工作流为准。',
    boundary: '本类同时包含脚本、分析和成片工作流。脚本工具不会自动交付视频；请先查看生成说明和输出类型。' },
  { id: 'writing', title: '文案与写作', description: '营销文案、摘要、改写与文章', representative: 'text-v1',
    prepare: '提供原始资料、目标读者、字数与语气。需要引用事实时，把可核对的来源一并提供。',
    check: '核对名称、数字、引用和事实；检查语气是否适合目标读者，删除没有依据的承诺。',
    batch: '每行放一份资料或一个主题；统一写作要求，先比较少量结果再批量扩展。',
    boundary: '输出是待审核的文本草稿。模型可能误读资料或补充没有依据的内容，发布前需要人工核对。' },
  { id: 'presentations', title: '汇报与演示', description: '汇报提纲、内容结构与表达检查', representative: '01a05ce5-4c6b-7284-8fea-71ee02ef07df',
    prepare: '准备主题、已有材料、受众、时长、页数限制和数据来源。说明希望听众记住的结论。',
    check: '核对论点与证据是否对应、图表口径是否一致，并按真实语速检查时间分配。',
    batch: '按行准备不同主题或受众的汇报要求，先确认一份提纲的结构与信息完整度。',
    boundary: '当前推荐工作流提供汇报提纲与内容检查，不代表会生成可下载的 PPT 文件。文件形式以具体工作流说明为准。' },
] as const;
export type SkillCategory = typeof skillCategories[number];
export type SkillCategoryId = SkillCategory['id'];
export function getSkillCategory(id?: string) { return skillCategories.find(category => category.id === id); }
type Classifiable = { displayName: string; outputType?: string; officialTemplateId?: string };
// Match the declared output and the task name, not incidental mentions in long descriptions.
// Categories can overlap (for example, a video script is also a writing task).
export function matchesSkillCategory(skill: Classifiable, category: SkillCategoryId) {
  const name = skill.displayName;
  if (category === 'images') return /^(image|图片|图像)$/i.test(skill.outputType || '') || skill.officialTemplateId === 'text-image-v1' || /生图|文生图|图生图|配图|插画|海报|套图|图复刻|白底图|场景图|图文卡片|视觉|image|illustration/i.test(name);
  if (category === 'video') return /^(video|视频)$/i.test(skill.outputType || '') || /视频|短剧|分镜|口播|video|storyboard/i.test(name);
  if (category === 'presentations') return /PPT|幻灯|演示|汇报|presentation|slides/i.test(name);
  return skill.officialTemplateId === 'text-v1' || /文案|写作|写作者|文章|改写|润色|摘要|扩写|文本生成|口播|脚本|公众号|小说|纪要|copywriting|writing/i.test(name);
}
