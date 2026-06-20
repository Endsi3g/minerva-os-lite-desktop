export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
}

export async function listDriveFiles(
  accessToken: string,
  parentFolderId?: string
): Promise<DriveFileItem[]> {
  let query = "trashed = false";
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  } else {
    query += " and mimeType != 'application/vnd.google-apps.folder'";
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,createdTime)&orderBy=createdTime desc&maxResults=30`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to list Drive files: ${response.statusText}`);
  }
  const data = await response.json();
  return data.files || [];
}

export async function uploadFileToDrive(
  accessToken: string,
  name: string,
  mimeType: string,
  content: string | Blob,
  parentFolderId?: string
): Promise<DriveFileItem> {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name,
    mimeType,
    parents: parentFolderId ? [parentFolderId] : undefined
  };

  const textContent = typeof content === 'string' ? content : await content.text();

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    textContent +
    closeDelimiter;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,createdTime';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to upload file to Drive: ${JSON.stringify(resData)}`);
  }
  return resData;
}

export async function exportToGoogleDocs(
  accessToken: string,
  name: string,
  htmlContent: string,
  parentFolderId?: string
): Promise<DriveFileItem> {
  // Google Drive API automatically converts HTML uploads to Google Doc format
  // if mimeType in metadata is set to 'application/vnd.google-apps.document'
  return uploadFileToDrive(
    accessToken,
    name,
    'application/vnd.google-apps.document',
    htmlContent,
    parentFolderId
  );
}

export async function getDriveFileDetails(
  accessToken: string,
  fileId: string
): Promise<DriveFileItem> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,createdTime`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Drive file details: ${response.statusText}`);
  }
  return response.json();
}
