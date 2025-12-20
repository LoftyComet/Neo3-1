import { AudioRecord } from "@/types";

const API_BASE_URL = "http://localhost:8000";

// Helper to map backend response to frontend type
const mapRecord = (record: any): AudioRecord => {
  // Handle both Windows (\) and Unix (/) path separators
  const filename = record.file_path.split(/[/\\]/).pop();
  return {
    id: record.id,
    latitude: record.latitude,
    longitude: record.longitude,
    emotion: record.emotion_tag || "Unknown",
    tags: record.scene_tags || [],
    story: record.generated_story || "No story generated yet.",
    audioUrl: `${API_BASE_URL}/static/uploads/${filename}`,
    createdAt: record.created_at,
  };
};

export const api = {
  // User
  createUser: async (username: string, email: string) => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password: "password" }), // Default password for guest
    });
    if (!response.ok) throw new Error("Failed to create user");
    return response.json();
  },

  getUser: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error("User not found");
    return response.json();
  },

  // Records
  getMapRecords: async (): Promise<AudioRecord[]> => {
    // Use latest records to ensure we see the most recent uploads
    const response = await fetch(`${API_BASE_URL}/api/v1/records/latest?limit=100`);
    if (!response.ok) throw new Error("Failed to fetch records");
    const data = await response.json();
    return data.map(mapRecord);
  },

  uploadRecord: async (file: Blob, lat: number, lng: number, userId?: string) => {
    const formData = new FormData();
    formData.append("file", file, "recording.webm");
    formData.append("latitude", lat.toString());
    formData.append("longitude", lng.toString());
    if (userId) {
      formData.append("user_id", userId);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/records/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    return mapRecord(data);
  }
};
