import { ApiError, jsonBody, readBody } from './server';
import { fileBuffer } from './workbook';

const maxBytes = 10 * 1024 * 1024;
export async function readAssetUpload(request: Request) {
  let filename: unknown, contentType: unknown, buffer: Buffer;
  if (request.headers.get('content-type')?.split(';')[0].trim() === 'application/octet-stream') {
    try { filename = decodeURIComponent(request.headers.get('x-upload-filename') || ''); }
    catch { throw new ApiError('附件文件名无效。'); }
    contentType = request.headers.get('x-upload-type') || 'application/octet-stream';
    validateMetadata(filename, contentType);
    buffer = await readBody(request, maxBytes);
    if (!buffer.length) throw new ApiError('文件为空。');
  } else {
    // Keep older open browser tabs working during and after deployment.
    const body = await jsonBody(request, 14 * 1024 * 1024);
    filename = body?.filename; contentType = body?.contentType;
    validateMetadata(filename, contentType);
    buffer = fileBuffer(body?.content, maxBytes);
  }
  return { filename: filename as string, contentType: contentType as string, content: buffer.toString('base64') };
}
function validateMetadata(filename: unknown, contentType: unknown) {
  if (typeof filename !== 'string' || !filename.trim() || filename.length > 255 || /[\x00-\x1f\x7f]/.test(filename)
    || typeof contentType !== 'string' || contentType.length > 255 || !/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(contentType)) throw new ApiError('附件信息无效。');
}
