# Remedi Chatbot Knowledge Base

Đây là knowledge base được sử dụng bởi LangGraph AI Chatbot để hỗ trợ khách hàng.

## 📂 Files

```
langgraph/knowledge/
├── system_overview.txt      - Tổng quan hệ thống
├── submission_guide.txt     - Hướng dẫn nộp hồ sơ
├── points_system.txt        - Hệ thống điểm thưởng
├── voucher_guide.txt        - Hướng dẫn voucher
├── pharmacy_guide.txt       - Tìm nhà thuốc
├── auth_guide.txt           - Đăng ký/Đăng nhập
├── troubleshooting.txt      - Xử lý lỗi
└── faq.txt                  - FAQ
```

## 🎯 Mục đích

Knowledge base này được tối ưu hóa để:
- ✅ LLM (Groq) có thể hiểu và xử lý
- ✅ Trả lời chính xác câu hỏi khách hàng
- ✅ Cung cấp hướng dẫn từng bước
- ✅ Format đơn giản, dễ đọc
- ✅ Tiếng Việt tự nhiên

## 📝 Format

- Plain text (.txt)
- UTF-8 encoding
- Cấu trúc rõ ràng với headers
- Bullet points cho danh sách
- Ví dụ cụ thể

## 🔄 Cách hoạt động

1. **Load Knowledge**: Chat agent load tất cả files khi khởi tạo
2. **Context Injection**: Nội dung được inject vào system prompt
3. **LLM Processing**: Groq LLM xử lý câu hỏi + knowledge
4. **Response**: Trả lời dựa trên knowledge base

## 📊 Statistics

- **Total files**: 8
- **Total lines**: ~800 lines
- **Coverage**: Tất cả major features
- **Language**: Vietnamese

## 🚀 Usage

Knowledge base được tự động load bởi `ChatSupportAgent`:

```python
from workflow.agents.chat_support_agent import ChatSupportAgent

agent = ChatSupportAgent(llm)
# Knowledge base được load tự động
```

## 🔧 Cập nhật Knowledge

Để cập nhật knowledge:

1. Edit các file .txt trong `langgraph/knowledge/`
2. Restart LangGraph service
3. Knowledge mới sẽ được load tự động

```bash
docker compose restart langgraph
```

## ✅ Best Practices

- **Ngắn gọn**: Mỗi section tập trung vào 1 chủ đề
- **Rõ ràng**: Sử dụng headers, bullets
- **Ví dụ**: Thêm ví dụ cụ thể
- **Cập nhật**: Update khi có thay đổi
- **Test**: Test chatbot sau khi update

## 📧 Contact

Nếu cần thêm knowledge hoặc cập nhật:
- Dev Team: dev@remedi.vn
- Update file trực tiếp trong `langgraph/knowledge/`
