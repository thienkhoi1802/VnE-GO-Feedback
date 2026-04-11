import { GoogleGenAI, Type } from "@google/genai";
import { ISSUE_CATEGORIES, IssueCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AIDiscoveredCategory extends IssueCategory {
  id: string;
}

export async function discoverCategories(feedbacks: string[]): Promise<AIDiscoveredCategory[]> {
  // Use a larger sample and more diverse selection for discovery
  const sample = feedbacks
    .filter(f => f.length > 15)
    .sort(() => 0.5 - Math.random())
    .slice(0, 150)
    .join("\n---\n");
  
  const prompt = `
    Bạn là một chuyên gia phân tích dữ liệu và trải nghiệm người dùng (UX Researcher) cấp cao tại VNExpress.
    Nhiệm vụ của bạn là phân tích sâu sắc các phản hồi (feedback) của người dùng về sản phẩm VnE-GO (nền tảng Video ngắn và Podcast).

    MỤC TIÊU:
    Khám phá ra các "Issue Categories" (Danh mục vấn đề) thực tế nhất, phản ánh đúng nỗi đau (pain points) của người dùng. 
    Hãy tìm kiếm các vấn đề cụ thể và phân loại chúng một cách thông minh:
    - Lỗi kỹ thuật trọng yếu: Load chậm, giật lag, đen màn hình, không có tiếng, lỗi autoplay, lỗi crash app.
    - Trải nghiệm tương tác (UX): Khó cuộn (scroll), điều hướng phức tạp, thiếu nút chức năng (next/back), lỗi giao diện trên các thiết bị cụ thể, khó tắt quảng cáo.
    - Tính năng mong đợi: Dark Mode, Phụ đề (Sub), tính năng tua (rewind/forward), tìm kiếm nội dung.
    - Chất lượng nội dung: Âm thanh kém, hình ảnh mờ, nội dung không hay, quảng cáo quá dày đặc.
    - Phản hồi tích cực: Khen ngợi, hài lòng, yêu thích.

    YÊU CẦU ĐỊNH DẠNG JSON (Array of objects):
    Mỗi đối tượng gồm:
    - id: string (snake_case, ví dụ: "video_playback_error")
    - label: string (Tiếng Việt, ngắn gọn nhưng đầy đủ ý nghĩa)
    - icon: string (emoji đại diện)
    - color: string (mã màu HEX: Đỏ cho lỗi, Cam cho UX, Xanh cho tích cực, Tím cho tính năng)
    - keywords: string[] (Danh sách ít nhất 25-30 từ khóa/cụm từ liên quan, bao gồm cả các từ lóng, viết tắt "ko", "k", "đơ", "lag", "giật"...)

    DỮ LIỆU FEEDBACK MẪU:
    ${sample}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              icon: { type: Type.STRING },
              color: { type: Type.STRING },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["id", "label", "icon", "color", "keywords"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error discovering categories:", error);
    return Object.entries(ISSUE_CATEGORIES).map(([id, cat]) => ({ id, ...cat }));
  }
}

export async function classifyBatch(feedbacks: { id: string, text: string, rating: number }[], categories: AIDiscoveredCategory[]): Promise<Record<string, string[]>> {
  const catList = categories.map(c => `${c.id}: ${c.label}`).join(", ");
  const feedbackList = feedbacks.map(f => `ID: ${f.id} | Rating: ${f.rating}★ | Content: ${f.text}`).join("\n");

  const prompt = `
    Phân loại chính xác các feedback sau vào các danh mục đã cho.
    DANH MỤC: ${catList}, positive (khen ngợi), unclassified (không rõ nghĩa).
    
    QUY TẮC PHÂN LOẠI:
    - Đọc kỹ ý nghĩa và RATING. 
    - KHÔNG ĐƯỢC để vào "unclassified" nếu feedback có nhắc đến bất kỳ tính năng hay bộ phận nào của app (ví dụ: cuộn, xem video, nghe nhạc, quảng cáo, giao diện).
    - Nếu feedback khen ngợi một tính năng cụ thể (ví dụ: "cuộn rất mượt"), hãy gán nhãn CẢ "positive" VÀ danh mục tính năng đó (ví dụ: "navigation").
    - Nếu feedback là một câu cảm thán chung chung về app (ví dụ: "App hay"), hãy gán vào "general_ux" và "positive".
    - Rating 1-2 sao: Tuyệt đối không được phân vào "positive" trừ khi nội dung cực kỳ rõ ràng là khen ngợi (rất hiếm).
    - Ưu tiên các lỗi kỹ thuật nếu có từ khóa liên quan.
    - Một feedback có thể thuộc nhiều danh mục.
    - Trả về JSON object: { "feedback_id": ["category_id1", "category_id2"] }

    FEEDBACKS:
    ${feedbackList}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          additionalProperties: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error classifying batch:", error);
    return {};
  }
}
