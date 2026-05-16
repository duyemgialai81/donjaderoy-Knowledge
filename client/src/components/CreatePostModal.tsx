import { useState, useEffect } from "react";
import { X, FileText, Upload, Video, Tag, BookOpen, Zap, Settings2 } from "lucide-react";
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
  const [major, setMajor] = useState("");
  const [majors, setMajors] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [subject, setSubject] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleMajorChange = (value: string) => {
    setMajor(value);
    setSubject("");
    api.getSubjectsForMajor(value, token || undefined)
      .then((subjects) => setAvailableSubjects(subjects || []))
      .catch(() => {
        api.getMajor(value, token || undefined)
          .then((res) => setAvailableSubjects((res?.subjects || res?.data?.subjects || []) as Subject[]))
          .catch(() => setAvailableSubjects([]));
      });
  };

  useEffect(() => {
    let mounted = true;
    api.getMajors(token || undefined).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (!mounted) return;
      if (Array.isArray(list)) {
        setMajors(list.map((m: any) => ({ id: m.id, name: m.name, code: m.code })));
      }
    }).catch(() => setMajors([]));
    return () => { mounted = false; };
  }, [token]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim() || !major || !subject) {
      alert("Vui lòng điền đầy đủ thông tin bắt buộc (tiêu đề, nội dung, ngành, môn học)");
      return;
    }
    const subjectName = availableSubjects.find((s) => s.id === subject)?.name || subject;
    onSubmit({ title, content, major, subject, tags, videoUrl: videoUrl || undefined, status, topic: subjectName });
    // Reset
    setTitle(""); setContent(""); setMajor(""); setSubject("");
    setAvailableSubjects([]); setTags([]); setVideoUrl(""); setStatus("published");
    onClose();
  };

  const SectionCard = ({ icon: Icon, title, iconColor, children }: any) => (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl p-0 gap-0">

        {/* ── Dialog Header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-slate-800">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#F26B38] to-[#D9541E] flex items-center justify-center shadow-sm">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Tạo bài viết mới
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* ── Section 1: Basic Info ── */}
          <SectionCard icon={BookOpen} title="Thông tin cơ bản" iconColor="bg-[#F26B38]">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Tiêu đề bài viết <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="Nhập tiêu đề bài viết..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-xl border-slate-200 focus:border-[#F26B38] focus:ring-[#F26B38]/20 bg-white text-sm"
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Nội dung <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Textarea
                  placeholder="Chia sẻ kiến thức, kinh nghiệm của bạn với cộng đồng FPT Polytechnic..."
                  className="min-h-[160px] rounded-xl border-slate-200 focus:border-[#F26B38] focus:ring-[#F26B38]/20 bg-white text-sm resize-none"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="absolute bottom-2 right-3 text-[10px] text-slate-400">
                  {content.length} ký tự
                </div>
              </div>
            </div>

            {/* Major + Subject */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Chuyên ngành <span className="text-red-400">*</span>
                </Label>
                <Select value={major} onValueChange={handleMajorChange}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                    <SelectValue placeholder="Chọn ngành..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {majors.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-sm">
                        <span className="font-medium text-[#F26B38]">{m.code}</span> – {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Môn học <span className="text-red-400">*</span>
                </Label>
                <Select value={subject} onValueChange={setSubject} disabled={!major}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white text-sm">
                    <SelectValue placeholder={major ? "Chọn môn học..." : "Chọn ngành trước"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-sm">
                        {s.code} – {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập tag và nhấn Enter..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }}
                  className="h-9 rounded-xl border-slate-200 bg-white text-sm flex-1"
                />
                <Button type="button" onClick={handleAddTag} variant="outline" className="h-9 rounded-xl px-3 border-slate-200 text-sm">
                  <Tag className="h-3.5 w-3.5 mr-1" /> Thêm
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="gap-1 bg-[#FEF0E8] text-[#D9541E] border-orange-200 text-xs font-medium hover:bg-orange-100"
                    >
                      #{tag}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setTags(tags.filter((t) => t !== tag))} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Section 2: Media & Files ── */}
          <SectionCard icon={Upload} title="Media & Tệp tin" iconColor="bg-blue-500">
            {/* File drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                isDragOver
                  ? "border-[#F26B38] bg-[#FEF0E8]"
                  : "border-slate-200 hover:border-[#F26B38] hover:bg-slate-50"
              }`}
            >
              <div className={`h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors ${
                isDragOver ? "bg-[#F26B38]" : "bg-slate-100"
              }`}>
                <Upload className={`h-6 w-6 ${isDragOver ? "text-white" : "text-slate-400"}`} />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {isDragOver ? "Thả file vào đây!" : "Kéo thả hoặc click để tải file"}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, PPTX – tối đa 10MB</p>
            </div>

            {/* Video URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-blue-500" /> Link YouTube (tùy chọn)
              </Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="h-9 rounded-xl border-slate-200 bg-white text-sm"
              />
            </div>
          </SectionCard>

          {/* ── Section 3: Publish Settings ── */}
          <SectionCard icon={Settings2} title="Cài đặt đăng bài" iconColor="bg-slate-500">
            <div className="flex gap-3">
              {(["published", "draft"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                    status === s
                      ? s === "published"
                        ? "border-[#F26B38] bg-[#FEF0E8] text-[#D9541E]"
                        : "border-slate-400 bg-slate-100 text-slate-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {s === "published"
                    ? <><Zap className="h-4 w-4" /> Đăng ngay</>
                    : <><FileText className="h-4 w-4" /> Lưu nháp</>}
                </button>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── Footer Actions ── */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="outline" onClick={onClose} className="h-10 px-5 rounded-xl text-sm border-slate-200">
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            className="h-10 px-6 rounded-xl text-sm font-semibold btn-gradient-orange"
          >
            {status === "draft" ? "💾 Lưu nháp" : "🚀 Đăng bài viết"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePostModal;