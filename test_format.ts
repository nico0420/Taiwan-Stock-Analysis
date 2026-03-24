function formatDate(date: Date, timezone: string, interval: string) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  if (interval === "60m") {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.hour12 = false;
  }
  
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(date);
  
  let year, month, day, hour, minute;
  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
    if (part.type === 'hour') hour = part.value;
    if (part.type === 'minute') minute = part.value;
  }
  
  if (interval === "60m") {
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
  return `${year}-${month}-${day}`;
}

console.log(formatDate(new Date('2026-03-24T05:30:04.000Z'), 'Asia/Taipei', '60m'));
console.log(formatDate(new Date('2026-03-24T05:30:04.000Z'), 'Asia/Taipei', '1d'));
console.log(formatDate(new Date('2026-03-23T23:00:00.000Z'), 'Asia/Taipei', '1d'));
