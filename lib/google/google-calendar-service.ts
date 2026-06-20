export interface CalendarListItem {
  id: string;
  summary: string;
  primary?: boolean;
}

export async function listCalendars(accessToken: string): Promise<CalendarListItem[]> {
  const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to list calendars: ${response.statusText}`);
  }
  const data = await response.json();
  return data.items || [];
}

export async function getFreeBusy(
  accessToken: string,
  timeMin: string,
  timeMax: string,
  calendarIds: string[]
): Promise<any> {
  const url = 'https://www.googleapis.com/calendar/v3/freeBusy';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: calendarIds.map(id => ({ id }))
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to query free/busy status: ${response.statusText}`);
  }
  return response.json();
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
    enableMeet?: boolean;
  }
): Promise<any> {
  const payload: any = {
    summary: event.summary,
    description: event.description || '',
    start: { dateTime: event.startTime },
    end: { dateTime: event.endTime },
    attendees: event.attendees?.map(email => ({ email })) || []
  };

  if (event.enableMeet) {
    payload.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    };
  }

  // Set conferenceDataVersion=1 query parameter to enable Meet links
  const queryParam = event.enableMeet ? '?conferenceDataVersion=1' : '';
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${queryParam}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${JSON.stringify(resData)}`);
  }
  return resData;
}

export async function patchCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    attendees?: string[];
  }
): Promise<any> {
  const payload: any = {};
  if (updates.summary !== undefined) payload.summary = updates.summary;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.startTime !== undefined) payload.start = { dateTime: updates.startTime };
  if (updates.endTime !== undefined) payload.end = { dateTime: updates.endTime };
  if (updates.attendees !== undefined) {
    payload.attendees = updates.attendees.map(email => ({ email }));
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to update calendar event: ${JSON.stringify(resData)}`);
  }
  return resData;
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete calendar event: ${response.statusText}`);
  }
}
