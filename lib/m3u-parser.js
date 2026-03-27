export function parseM3U(content) {
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  const channels = [];
  
  let currentChannel = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('#EXTINF:')) {
      // Parse EXTINF line
      currentChannel = {};
      
      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      if (logoMatch) {
        currentChannel.logo = logoMatch[1];
      }
      
      // Extract group-title
      const groupMatch = line.match(/group-title="([^"]+)"/);
      if (groupMatch) {
        currentChannel.groupTitle = groupMatch[1];
      }
      
      // Extract channel name (after the last comma)
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch) {
        currentChannel.name = nameMatch[1].trim();
      }
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      // This is a URL line
      if (currentChannel.name) {
        currentChannel.url = line;
        channels.push({ ...currentChannel });
        currentChannel = {};
      }
    }
  }
  
  return channels;
}

export async function fetchM3U(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch M3U playlist');
    }
    const content = await response.text();
    return parseM3U(content);
  } catch (error) {
    console.error('M3U fetch error:', error);
    throw error;
  }
}
