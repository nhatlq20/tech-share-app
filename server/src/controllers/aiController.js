import Device from "../models/Device.js";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Hàm gọi Gemini và tự retry khi bị 503
const generateAI = async (prompt) => {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
          responseMimeType: "application/json",

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              pros: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },

              cons: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
              },

              advice: {
                type: Type.STRING,
              },
            },

            required: ["pros", "cons", "advice"],
          },
        },
      });

      // Thành công thì trả response luôn
      return response;
    } catch (error) {
      lastError = error;

      console.log(`Gemini attempt ${attempt + 1} failed:`, error.status);

      // Nếu không phải 503 thì không cần retry
      if (error.status !== 503) {
        throw error;
      }

      // Nếu vẫn còn lượt retry
      if (attempt < 2) {
        // lần 1 chờ 2 giây
        // lần 2 chờ 4 giây
        const delay = 2000 * Math.pow(2, attempt);

        console.log(`Gemini quá tải. Retry sau ${delay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Thử 3 lần vẫn thất bại
  throw lastError;
};

export const summarizeReview = async (req, res) => {
  try {
    // 1. Lấy deviceId từ URL
    const { deviceId } = req.params;

    // 2. Tìm thiết bị trong MongoDB
    const device = await Device.findById(deviceId);

    if (!device) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    // 3. Tạo prompt
    const prompt = `
Bạn là chuyên gia tư vấn thiết bị công nghệ cho một ứng dụng cho thuê thiết bị.

Hãy phân tích thiết bị dưới đây:

Tên thiết bị: ${device.name}
Thương hiệu: ${device.brand}
Danh mục: ${device.category}
Tình trạng: ${device.condition}
Giá thuê mỗi ngày: ${device.pricePerDay}
Tiền đặt cọc: ${device.depositAmount}
Năm sản xuất: ${device.yearOfManufacture}

Mô tả:
${device.description || "Không có mô tả"}

Thông số kỹ thuật:
${JSON.stringify(device.specs || {})}

Phụ kiện:
${JSON.stringify(device.accessories || [])}

Hãy:
- Đưa ra các ưu điểm của thiết bị.
- Đưa ra các nhược điểm cần cân nhắc khi thuê.
- Đưa ra lời khuyên thiết bị phù hợp thuê cho mục đích nào.
- Trả lời bằng tiếng Việt.
- Ngắn gọn, dễ hiểu.
`;

    // 4. Gọi Gemini
    const response = await generateAI(prompt);

    // 5. Chuyển JSON Gemini thành Object
    const aiReview = JSON.parse(response.text);

    // 6. Trả về client
    return res.status(200).json({
      message: "AI review generated successfully",
      data: aiReview,
    });
  } catch (error) {
    console.log("AI Review Error:", error);

    // Gemini quá tải sau khi retry 3 lần
    if (error.status === 503) {
      return res.status(503).json({
        message: "AI đang quá tải, vui lòng thử lại sau.",
      });
    }

    // Lỗi khác
    return res.status(error.status || 500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

const compareItemSchema = {
  type: Type.OBJECT,

  properties: {
    device1: {
      type: Type.STRING,
    },

    device2: {
      type: Type.STRING,
    },

    winner: {
      type: Type.STRING,
    },
  },

  required: ["device1", "device2", "winner"],
};

const aiCompareSchema = {
  type: Type.OBJECT,

  properties: {
    power: compareItemSchema,
    battery: compareItemSchema,
    weight: compareItemSchema,
    valueForMoney: compareItemSchema,

    conclusion: {
      type: Type.STRING,
    },

    recommendation: {
      type: Type.STRING,
    },
  },

  required: [
    "power",
    "battery",
    "weight",
    "valueForMoney",
    "conclusion",
    "recommendation",
  ],
};

export const compareDevices = async (req, res) => {
  try {
    const { deviceId1, deviceId2 } = req.body;
    if (!deviceId1 || !deviceId2) {
      return res.status(400).json({
        message: "Please select two devices",
      });
    }

    if (deviceId1 === deviceId2) {
      return res.status(400).json({
        message: "Please select two different devices",
      });
    }

    const device1 = await Device.findById(deviceId1);
    const device2 = await Device.findById(deviceId2);

    if (!device1 || !device2) {
      return res.status(404).json({
        message: "Device not found",
      });
    }

    const prompt = `
Bạn là chuyên gia phân tích và so sánh thiết bị công nghệ
cho một ứng dụng cho thuê thiết bị.

Hãy so sánh chi tiết hai thiết bị sau.

THIẾT BỊ 1:

Tên: ${device1.name}
Thương hiệu: ${device1.brand}
Danh mục: ${device1.category}
Năm sản xuất: ${device1.yearOfManufacture}
Tình trạng: ${device1.condition}
Giá thuê mỗi ngày: ${device1.pricePerDay}
Thông số kỹ thuật:
${JSON.stringify(device1.specs || {})}


THIẾT BỊ 2:

Tên: ${device2.name}
Thương hiệu: ${device2.brand}
Danh mục: ${device2.category}
Năm sản xuất: ${device2.yearOfManufacture}
Tình trạng: ${device2.condition}
Giá thuê mỗi ngày: ${device2.pricePerDay}
Thông số kỹ thuật:
${JSON.stringify(device2.specs || {})}


Hãy so sánh hai thiết bị theo 4 tiêu chí:

1. Sức mạnh (power)
2. Pin (battery)
3. Trọng lượng (weight)
4. Hiệu năng trên giá thuê (valueForMoney)

Mỗi tiêu chí cần:
- Nhận xét ngắn gọn cho thiết bị 1.
- Nhận xét ngắn gọn cho thiết bị 2.
- Cho biết thiết bị nào tốt hơn ở tiêu chí đó.

Cuối cùng:
- Đưa ra kết luận tổng thể.
- Đề xuất thiết bị phù hợp hơn để thuê.
- Chỉ dựa trên dữ liệu được cung cấp.
- Nếu thiếu thông số, hãy nói rõ là không đủ dữ liệu.
- Không tự bịa thông số kỹ thuật.
- Trả lời bằng tiếng Việt.
- Ngắn gọn và dễ hiểu.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,

      config: {
        responseMimeType: "application/json",
        responseSchema: aiCompareSchema,
      },
    });

    const comparison = JSON.parse(response.text);
    return res.status(200).json({
      message: "AI comparison generated successfully",
      data: comparison,
    });
  } catch (error) {
    console.log("AI Compare Error:", error);

    if (error.status === 503) {
      return res.status(503).json({
        message: "AI đang quá tải, vui lòng thử lại sau.",
      });
    }

    return res.status(error.status || 500).json({
      message: "AI comparison failed",
      error: error.message,
    });
  }
};
