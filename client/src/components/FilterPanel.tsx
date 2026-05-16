import { Filter, X, ChevronDown, BookOpen, GraduationCap, Search as SearchIcon, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import type { Subject } from "../lib/mockData";
import api from "../lib/api";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/authContext";
import { localStorage_service } from "../lib/localStorage";

interface FilterPanelProps {
  filters: {
    major: string;
    subject: string;
    tags: string[];
    sortBy: string;
  };
  onFilterChange: (filters: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function FilterPanel({ filters, onFilterChange, isOpen, onToggle }: FilterPanelProps) {
  const { user } = useAuth();
  const token = localStorage_service.getAuthToken();
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [majors, setMajors] = useState<{ id: string; name: string; code?: string }[]>([]);
  const allTags = ['React', 'TypeScript', 'Node.js', 'Python', 'Java', 'SQL', 'UI/UX', 'Security', 'DevOps', 'Mobile'];

  // Update available subjects when major changes
  useEffect(() => {
    let mounted = true;
    // fetch majors from API 
    api.getMajors(token || undefined).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (mounted && Array.isArray(list)) setMajors(list.map((m: any) => ({ id: m.id, name: m.name, code: m.code })));
    }).catch(() => {
      setMajors([]);
    });
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (filters.major && filters.major !== 'all') {
      // filters.major is the major id; fetch major details including subjects
      const majorId = filters.major;
      api.getSubjectsForMajor(majorId, token || undefined).then((subjects) => {
        setAvailableSubjects(subjects || []);
      }).catch(() => {
        api.getMajor(majorId, token || undefined).then((res) => {
          const data = res || res?.data || {};
          const subjects = data?.subjects || [];
          setAvailableSubjects(subjects);
        }).catch(() => {
          setAvailableSubjects([]);
        });
      });
    } else {
      setAvailableSubjects([]);
    }
  }, [filters.major, majors, token]);

  const handleMajorChange = (value: string) => {
    onFilterChange({ 
      ...filters, 
      major: value,
      subject: 'all' // Reset subject when major changes
    });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const clearFilters = () => {
    onFilterChange({
      major: 'all',
      subject: 'all',
      tags: [],
      sortBy: 'newest'
    });
  };

  const activeFiltersCount = 
    (filters.major !== 'all' ? 1 : 0) +
    (filters.subject !== 'all' ? 1 : 0) +
    filters.tags.length;

  const selectedMajor = majors.find((m: any) => m.id === filters.major);
  const selectedSubject = availableSubjects.find((s: any) => s.id === filters.subject) || availableSubjects.find((s: any) => s.name === filters.subject);

  return (
    <div className="bg-white border-b sticky top-16 z-40">
      <div className="container mx-auto px-4 py-4">
        {/* Filter Bar - Always Visible */}
        <div className="flex items-center gap-4">
          {/* Step 1: Select Major */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Bước 1: Chọn ngành học</span>
            </div>
            <Select
              value={filters.major}
              onValueChange={handleMajorChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn ngành học..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ngành</SelectItem>
                {majors.map((major) => (
                  <SelectItem key={major.id} value={major.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600">{major.code}</span>
                      <span>{major.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Select Subject */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Bước 2: Chọn môn học</span>
            </div>
            <Select
              value={filters.subject}
              onValueChange={(value: string) => onFilterChange({ ...filters, subject: value })}
              disabled={!filters.major || filters.major === 'all'}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  filters.major && filters.major !== 'all' 
                    ? "Chọn môn học..." 
                    : "Chọn ngành trước..."
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả môn học</SelectItem>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <div className="flex flex-col">
                      <span>{subject.name}</span>
                      <span className="text-xs text-gray-500">
                        {subject.code} • {subject.credits} tín chỉ • Kỳ {subject.semester}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Sort */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <SearchIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm">Bước 3: Sắp xếp kết quả</span>
            </div>
            <Select
              value={filters.sortBy}
              onValueChange={(value: string) => onFilterChange({ ...filters, sortBy: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Mới nhất</SelectItem>
                <SelectItem value="popular">Phổ biến nhất</SelectItem>
                <SelectItem value="mostLiked">Nhiều lượt thích</SelectItem>
                <SelectItem value="mostCommented">Nhiều bình luận</SelectItem>
                <SelectItem value="mostViewed">Nhiều lượt xem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filter Toggle */}
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Xóa bộ lọc
              </Button>
            )}
            <Button
              variant={isOpen ? "default" : "outline"}
              onClick={onToggle}
              className={isOpen ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Tùy chỉnh
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="ml-2 bg-white text-orange-600">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Active Filter Path */}
        {(filters.major !== 'all' || filters.subject !== 'all') && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Đang xem:</span>
            <div className="flex items-center gap-2">
              {filters.major !== 'all' && (
                <>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {selectedMajor?.code} - {selectedMajor?.name}
                  </Badge>
                  {filters.subject !== 'all' && (
                    <>
                      <ChevronRight className="h-3 w-3 text-gray-400" />
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedSubject?.code} - {selectedSubject?.name || filters.subject}
                      </Badge>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Expanded Advanced Filters */}
        {isOpen && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Bộ lọc nâng cao
            </h3>

            <div className="space-y-4">
              {/* Tags Filter */}
              <div>
                <label className="text-sm mb-2 block">Lọc theo Tags</label>
                <div className="flex flex-wrap gap-2 p-3 border rounded bg-white">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.tags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        filters.tags.includes(tag) 
                          ? 'bg-orange-600 hover:bg-orange-700' 
                          : 'hover:bg-orange-100'
                      }`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                      {filters.tags.includes(tag) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Subject Info */}
              {filters.subject && filters.subject !== 'all' && selectedSubject && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="mb-2">Thông tin môn học</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Mã môn:</span>
                      <p className="text-blue-600">{selectedSubject.code}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Số tín chỉ:</span>
                      <p>{selectedSubject.credits} tín chỉ</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Học kỳ:</span>
                      <p>Kỳ {selectedSubject.semester}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}