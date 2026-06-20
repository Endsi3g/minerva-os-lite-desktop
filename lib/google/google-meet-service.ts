import { createCalendarEvent } from './google-calendar-service';

export interface MeetConference {
  meetLink: string;
  calendarEventId: string;
  meetingCode?: string;
}

export async function createMeetConference(
  accessToken: string,
  calendarId: string,
  summary: string,
  startTime: string,
  endTime: string
): Promise<MeetConference> {
  const event = await createCalendarEvent(accessToken, calendarId, {
    summary,
    startTime,
    endTime,
    enableMeet: true
  });

  const meetLink = event.hangoutLink || '';
  let meetingCode = '';

  if (meetLink) {
    // Extract code from meet link (e.g., meet.google.com/abc-defg-hij -> abc-defg-hij)
    const parts = meetLink.split('/');
    meetingCode = parts[parts.length - 1] || '';
  }

  return {
    meetLink,
    calendarEventId: event.id,
    meetingCode
  };
}

export async function getMeetConferenceDetails(
  accessToken: string,
  conferenceId: string
): Promise<any> {
  // Simulates or uses REST fetch for meeting info
  // Google Meet API details can be retrieved via the Calendar Event or Meet API if enabled
  return {
    conferenceId,
    status: 'active',
    activeParticipants: 0,
    startTime: new Date().toISOString()
  };
}

export async function getMeetArtifacts(
  accessToken: string,
  meetingCode: string
): Promise<any[]> {
  if (!meetingCode) return [];

  // Meet recordings and transcripts are saved directly to Google Drive.
  // We can query Drive for files with names containing the meeting code.
  const query = `name contains '${meetingCode}'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,createdTime)`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    console.error('Failed to query Meet artifacts from Drive:', response.statusText);
    return [];
  }

  const data = await response.json();
  return data.files || [];
}
