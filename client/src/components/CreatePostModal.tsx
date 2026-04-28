import { useState } from "react";
import { X, FileText, Upload, Video, Tag, BookOpen } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import type { Subject } from "../lib/mockData";
import api from "../lib/api";
import { useEffect } from "react";
import { useAuth } from "../lib/authContext";
import { localStorage_service } from "../lib/localStorage";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: any) => void;
}

export function CreatePostModal({ isOpen, onClose, onSubmit }: CreatePostModalProps) {
  const { user } = useAuth();
  const token = localStorage_service.getAuthToken();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // major is now an id (if using API), still support name for fallback
  const [major, setMajor] = useState("");
  const [majors, setMajors] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [subject, setSubject] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");

  const handleMajorChange = (value: string) => {
    setMajor(value);
    setSubject(""); // Reset subject when major changes
    // find subjects in cached majors if available
    const selected = majors.find(m => m.id === value);
    if (selected) {
      // fetch major details (including subjects) from api if available
      api.getSubjectsForMajor(value, token || undefined).then((subjects) => {
        setAvailableSubjects(subjects || []);
      }).catch(() => {
        api.getMajor(value, token || undefined).then((res) => {
          const subjects = (res?.subjects || res?.data?.subjects || []) as Subject[];
          setAvailableSubjects(subjects as Subject[]);
        }).catch(() => {
          // fallback: clear available
          setAvailableSubjects([]);
        });
      });
    } else {
      setAvailableSubjects([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    api.getMajors(token || undefined).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (!mounted) return;
      if (Array.isArray(list)) {
        setMajors(list.map((m: any) => ({ id: m.id, name: m.name, code: m.code })));
      }
    }).catch(() => {
      // API failed, set empty
      setMajors([]);
    });
    return () => { mounted = false; };
  }, [token]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim() || !major || !subject) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc (tiêu đề, nội dung, ngành, môn học)");
      return;
    }

    // resolve major name from id if possible
        const majorName = majors.find(m => m.id === major)?.name || major;
        const subjectName = availableSubjects.find(s => s.id === subject)?.name || subject;
        onSubmit({
          title,
          content,
          // store ids for major and subject; UI will resolve names for display
          major,
          subject,
      tags,
      videoUrl: videoUrl || undefined,
      status,
          topic: subjectName // For backward compatibility
    });

    // Reset form
    setTitle("");
    setContent("");
    setMajor("");
    setSubject("");
    setAvailableSubjects([]);
    setTags([]);
    setVideoUrl("");
    setStatus("published");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Tạo bài viết mới
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">
              Tiêu đề bài viết <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Nhập tiêu đề bài viết..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Content */}
          <div>
            <Label htmlFor="content">
              Nội dung <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="content"
              placeholder="Chia sẻ kiến thức của bạn..."
              className="min-h-[200px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Major and Topic */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="major">
                Chuyên ngành <span className="text-red-500">*</span>
              </Label>
              <Select value={major} onValueChange={handleMajorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn chuyên ngành" />
                </SelectTrigger>
                <SelectContent>
                  {majors.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.code} - {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">
                Môn học <span className="text-red-500">*</span>
              </Label>
                <Select 
                value={subject} 
                onValueChange={setSubject}
                disabled={!major}
              >
                <SelectTrigger>
                  <SelectValue placeholder={major ? "Chọn môn học" : "Chọn ngành trước"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tags"
                placeholder="Nhập tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                <Tag className="h-4 w-4 mr-1" />
                Thêm
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
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

          {/* Video URL */}
          <div>
            <Label htmlFor="videoUrl">
              <Video className="h-4 w-4 inline mr-1" />
              Link video YouTube (tùy chọn)
            </Label>
            <Input
              id="videoUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </div>

          {/* File Upload (Mock) */}
          <div>
            <Label>
              <Upload className="h-4 w-4 inline mr-1" />
              Tệp đính kèm (PDF, DOCX, PPTX)
            </Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-orange-300 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">
                Kéo thả file vào đây hoặc click để chọn
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Hỗ trợ: PDF, DOCX, PPTX (tối đa 10MB)
              </p>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label>Trạng thái</Label>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Đăng ngay</SelectItem>
                <SelectItem value="draft">Lưu nháp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700">
            {status === 'draft' ? 'Lưu nháp' : 'Đăng bài'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

  // Load majors once on module mount - we could also do this inside component, but keep simple
  export default CreatePostModal;