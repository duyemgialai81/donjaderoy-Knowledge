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

  // Fetch majors from API
  useEffect(() => {
    let mounted = true;
    api.getMajors(token || undefined).then((res) => {
      const list = Array.isArray(res) ? res : (res?.data || res);
      if (mounted && Array.isArray(list))
        setMajors(list.map((m: any) => ({ id: m.id, name: m.name, code: m.code })));
    }).catch(() => {
      setMajors([]);
    });
    return () => { mounted = false; };
  }, [token]);

  // Fetch subjects when major changes
  useEffect(() => {
    if (filters.major && filters.major !== 'all') {
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
      subject: 'all',
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
      sortBy: 'newest',
    });
  };

  const activeFiltersCount =
    (filters.major !== 'all' ? 1 : 0) +
    (filters.subject !== 'all' ? 1 : 0) +
    filters.tags.length;

  const selectedMajor = majors.find((m: any) => m.id === filters.major);
  const selectedSubject =
    availableSubjects.find((s: any) => s.id === filters.subject) ||
    availableSubjects.find((s: any) => s.name === filters.subject);

  return (
    <div className="filter-panel bg-white border-b sticky top-16 z-40">
      <div className="filter-panel-inner container mx-auto px-3 sm:px-4 py-3 sm:py-4">

        {/* ── Filter Bar ── */}
        <div className="filter-panel-row flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-3 lg:gap-4">

          {/* Step 1: Ngành học */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <GraduationCap className="h-4 w-4 text-orange-600 shrink-0" />
              <span className="text-xs sm:text-sm text-gray-600 truncate">
                Bước 1: Chọn ngành học
              </span>
            </div>
            <Select value={filters.major} onValueChange={handleMajorChange}>
              <SelectTrigger className="w-full text-sm h-9 sm:h-10">
                <SelectValue placeholder="Chọn ngành học..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ngành</SelectItem>
                {majors.map((major) => (
                  <SelectItem key={major.id} value={major.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600 font-medium">{major.code}</span>
                      <span>{major.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Môn học */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-xs sm:text-sm text-gray-600 truncate">
                Bước 2: Chọn môn học
              </span>
            </div>
            <Select
              value={filters.subject}
              onValueChange={(value: string) =>
                onFilterChange({ ...filters, subject: value })
              }
              disabled={!filters.major || filters.major === 'all'}
            >
              <SelectTrigger className="w-full text-sm h-9 sm:h-10">
                <SelectValue
                  placeholder={
                    filters.major && filters.major !== 'all'
                      ? 'Chọn môn học...'
                      : 'Chọn ngành trước...'
                  }
                />
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

          {/* Step 3: Sắp xếp */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <SearchIcon className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-xs sm:text-sm text-gray-600 truncate">
                Bước 3: Sắp xếp kết quả
              </span>
            </div>
            <Select
              value={filters.sortBy}
              onValueChange={(value: string) =>
                onFilterChange({ ...filters, sortBy: value })
              }
            >
              <SelectTrigger className="w-full text-sm h-9 sm:h-10">
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

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:shrink-0">
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700 px-2 sm:px-3"
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Xóa bộ lọc</span>
              </Button>
            )}
            <Button
              variant={isOpen ? 'default' : 'outline'}
              size="sm"
              onClick={onToggle}
              className={`
                h-9 sm:h-10 flex-1 sm:flex-none
                ${isOpen ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
              `}
            >
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Tùy chỉnh</span>
              {activeFiltersCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1.5 bg-white text-orange-600 text-xs px-1.5 py-0"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* ── Active Filter Breadcrumb ── */}
        {(filters.major !== 'all' || filters.subject !== 'all') && (
          <div className="mt-2.5 flex items-center gap-2 text-xs sm:text-sm flex-wrap">
            <span className="text-gray-500 shrink-0">Đang xem:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {filters.major !== 'all' && (
                <>
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                  >
                    {selectedMajor?.code} - {selectedMajor?.name}
                  </Badge>
                  {filters.subject !== 'all' && (
                    <>
                      <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                      >
                        {selectedSubject?.code} - {selectedSubject?.name || filters.subject}
                      </Badge>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Advanced Filters Panel ── */}
        {isOpen && (
          <div className="mt-3 p-3 sm:p-4 border rounded-lg bg-gray-50">
            <h3 className="mb-3 text-sm sm:text-base flex items-center gap-2 font-medium">
              <Filter className="h-4 w-4" />
              Bộ lọc nâng cao
            </h3>

            <div className="space-y-4">
              {/* Tags */}
              <div>
                <label className="text-xs sm:text-sm mb-2 block text-gray-600">
                  Lọc theo Tags
                </label>
                <div className="flex flex-wrap gap-2 p-3 border rounded bg-white">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                      className={`cursor-pointer transition-all text-xs sm:text-sm ${
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
                <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="mb-2 text-sm font-medium">Thông tin môn học</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-600">Mã môn:</span>
                      <p className="text-blue-600 font-medium">{selectedSubject.code}</p>
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
