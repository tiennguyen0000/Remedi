import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreatePostRequest } from "@shared/forumTypes";
import { X, Plus } from "lucide-react";

interface CreatePostProps {
  onSubmit: (post: CreatePostRequest) => Promise<void>;
}

export function CreatePost({ onSubmit }: CreatePostProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<CreatePostRequest>({
    title: "",
    content: "",
    imageUrl: null,
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, just create an object URL
    // In production, upload to a server first
    const imageUrl = URL.createObjectURL(file);
    setForm({ ...form, imageUrl });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm({
        ...form,
        tags: [...(form.tags || []), tagInput.trim()],
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm({
      ...form,
      tags: form.tags?.filter((t) => t !== tag) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng điền đầy đủ thông tin",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ title: "", content: "", imageUrl: null, tags: [] });
      setTagInput("");
      toast({ description: "Đăng bài thành công" });
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể đăng bài",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Tiêu đề *</Label>
        <Input
          id="title"
          placeholder="Tiêu đề bài viết"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          maxLength={500}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Nội dung *</Label>
        <Textarea
          id="content"
          placeholder="Nội dung bài viết..."
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (tùy chọn)</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            placeholder="Thêm tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button type="button" onClick={handleAddTag} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {form.tags && form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemoveTag(tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="image">Hình ảnh (tùy chọn)</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
        {form.imageUrl && (
          <div className="relative mt-2">
            <img
              src={form.imageUrl}
              alt="Preview"
              className="max-h-48 object-contain rounded-md border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => setForm({ ...form, imageUrl: null })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Đang đăng..." : "Đăng bài"}
      </Button>
    </form>
  );
}
