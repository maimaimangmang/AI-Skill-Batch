import { cellText } from './domain';
import type { InputRow, Listing, Schema } from './types';

export type ExampleImage = { src: string; label: string };
export type WorkflowExample = {
  label: string;
  input: InputRow;
  inputImages?: ExampleImage[];
  output?: ExampleImage;
};

// The author asked to display these trials. The same public input images were
// used for each model; each output is the actual result of that specific run.
// Sources: output/ecommerce-image-remix/funded-status.json and
// output/ecommerce-image-remix-economy/seedream-4.5.watch.json.
const remixTrial: WorkflowExample = {
  label: '作者试跑案例（GPT Image 2）',
  input: {
    language: '简体中文',
    requirements: '保留参考图暖黄色灯光、床头木桌和温馨氛围，以产品原图中的陶瓷杯为主角，清理杂物，不加文案。杯子保持陶瓷质感，不要发光。',
  },
  inputImages: [
    { src: '/examples/ecommerce-image-remix/reference.png', label: '参考图' },
    { src: '/examples/ecommerce-image-remix/product.jpeg', label: '产品原图' },
  ],
  output: { src: '/examples/ecommerce-image-remix/result.png', label: '试跑成品：暖光床头场景中的陶瓷杯' },
};

const doubaoTrial: WorkflowExample = {
  label: '作者试跑案例（豆包4.5）',
  input: {
    language: '简体中文',
    requirements: '保留参考图暖黄色灯光、床头木桌和温馨氛围，以产品原图中的陶瓷杯为主角，清理杂物，不加文案。杯子保持陶瓷质感，不要发光。',
    size: '2048x2048',
  },
  inputImages: [
    { src: '/examples/ecommerce-image-remix/reference.png', label: '参考图' },
    { src: '/examples/ecommerce-image-remix/product.jpeg', label: '产品原图' },
  ],
  output: { src: '/examples/ecommerce-image-remix/seedream-4.5-result.jpeg', label: '豆包4.5试跑成品：暖光床头场景中的陶瓷杯' },
};

export function workflowExamples(listing: Listing, schema: Schema): WorkflowExample[] {
  const samples = (schema.sample_rows || [])
    .filter(row => row && typeof row === 'object' && !Array.isArray(row) && schema.fields.some(field => cellText(row[field.key]).trim()))
    .slice(0, 10).map((input, index) => ({ label: `填写示例 ${index + 1}`, input }));
  if (listing.id === '01a0ccea-2449-7796-ba40-bfcded89b97d'
    && listing.listingVersionId === '01a0ccf2-f42f-7486-8198-69922ca9c15c') {
    return [remixTrial, ...samples].slice(0, 10);
  }
  if (listing.id === '01a0d302-73cd-7702-a072-0358de4e9b86'
    && (listing.listingVersionId === '01a0d302-73e8-7936-a8e3-80a108d19bb2'
      || listing.listingVersionId === '01a0e65c-b596-7d8d-a9dd-a17844947f94')) {
    return [doubaoTrial, ...samples].slice(0, 10);
  }
  return samples;
}
