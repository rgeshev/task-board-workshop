import { supabase } from '../supabase.js';

export const BUCKET_NAME = 'task-attachments';
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

const SIGNED_URL_EXPIRY_SECONDS = 3600;

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export function validateAttachmentFile(file) {
  if (!file) {
    throw new Error('No file selected.');
  }

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    throw new Error('Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.');
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('File exceeds the 50 MB size limit.');
  }

  if (file.size <= 0) {
    throw new Error('File is empty.');
  }
}

async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('You must be signed in to manage attachments.');
  return data.user.id;
}

export async function fetchTaskAttachments(taskId) {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('id, task_id, file_name, storage_path, mime_type, size_bytes, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function uploadTaskAttachment(taskId, file) {
  validateAttachmentFile(file);

  const userId = await getCurrentUserId();
  const storagePath = `${userId}/${taskId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('task_attachments')
    .insert({
      task_id: taskId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select('id, task_id, file_name, storage_path, mime_type, size_bytes, created_at')
    .single();

  if (error) {
    await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    throw error;
  }

  return data;
}

export async function deleteTaskAttachment(attachment) {
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([attachment.storage_path]);

  if (storageError) throw storageError;

  const { error } = await supabase.from('task_attachments').delete().eq('id', attachment.id);
  if (error) throw error;
}

export async function deleteAllTaskAttachments(taskId) {
  const attachments = await fetchTaskAttachments(taskId);
  if (!attachments.length) return;

  const paths = attachments.map((attachment) => attachment.storage_path);
  const { error: storageError } = await supabase.storage.from(BUCKET_NAME).remove(paths);
  if (storageError) throw storageError;

  const { error } = await supabase.from('task_attachments').delete().eq('task_id', taskId);
  if (error) throw error;
}

export async function getAttachmentDownloadUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}
