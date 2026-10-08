import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Star,
  Award,
  Calendar,
  Filter,
  BarChart3,
  MessageSquareHeart,
  Sparkles,
  Info,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { SurveyFeedback } from '../types';
import { getWitaDateParts } from '../utils/witaTime';

interface SurveyTrendChartProps {
  surveys: SurveyFeedback[];
  onOpenSurveyForm?: () => void;
  wardName?: string;
  hospitalName?: string;
}

interface DayDataPoint {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "08 Okt"
  fullDayLabel: string; // e.g. "Rabu, 08 Okt 2026"
  dailyAvg: number | null; // null if no survey on that day
  trendRating: number | null; // connected trend line value
  count: number;
  star5: number;
  star4: number;
  star3: number;
  star2: number;
  star1: number;
  surveys: SurveyFeedback[];
}

const MONTH_NAMES_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const DAY_NAMES_ID = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
];

export const SurveyTrendChart: React.FC<SurveyTrendChartProps> = ({
  surveys,
  onOpenSurveyForm,
  wardName = 'Ruang Rawat Inap',
  hospitalName = 'RS Citra Sehat Care',
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter surveys by category if selected
  const categoryFilteredSurveys = useMemo(() => {
    if (selectedCategory === 'all') return surveys;
    return surveys.filter((s) => s.category === selectedCategory);
  }, [surveys, selectedCategory]);

  // Generate 30-day data points in WITA timezone
  const trendData = useMemo(() => {
    const todayParts = getWitaDateParts(new Date());
    // Create UTC midnight anchor from today's WITA parts
    const anchorDate = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));

    // Map surveys by YYYY-MM-DD
    const surveysByDate: Record<string, SurveyFeedback[]> = {};
    categoryFilteredSurveys.forEach((s) => {
      let dateKey = '';
      // Parse YYYY-MM-DD from createdAt string (e.g. '2026-10-06 14:15 WITA' or ISO)
      const match = s.createdAt.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        const y = match[1];
        const m = String(match[2]).padStart(2, '0');
        const d = String(match[3]).padStart(2, '0');
        dateKey = `${y}-${m}-${d}`;
      } else {
        const parsed = new Date(s.createdAt.replace(/\s*WITA/i, ''));
        if (!isNaN(parsed.getTime())) {
          const parts = getWitaDateParts(parsed);
          dateKey = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
        }
      }

      if (dateKey) {
        if (!surveysByDate[dateKey]) surveysByDate[dateKey] = [];
        surveysByDate[dateKey].push(s);
      }
    });

    const points: DayDataPoint[] = [];
    let lastKnownRating: number = 4.8; // Baseline fallback for empty pre-trend

    // Pre-calculate an initial baseline if any survey exists
    if (categoryFilteredSurveys.length > 0) {
      const overallAvg =
        categoryFilteredSurveys.reduce((acc, curr) => acc + curr.rating, 0) /
        categoryFilteredSurveys.length;
      lastKnownRating = Number(overallAvg.toFixed(2));
    }

    // Build 30 days: from 29 days ago up to today
    for (let i = 29; i >= 0; i--) {
      const d = new Date(anchorDate.getTime() - i * 24 * 60 * 60 * 1000);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth(); // 0-indexed
      const dateNum = d.getUTCDate();
      const dayOfWeek = d.getUTCDay();

      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
      const dayLabel = `${String(dateNum).padStart(2, '0')} ${MONTH_NAMES_ID[m]}`;
      const fullDayLabel = `${DAY_NAMES_ID[dayOfWeek]}, ${dateNum} ${MONTH_NAMES_ID[m]} ${y}`;

      const daySurveys = surveysByDate[dateStr] || [];
      const count = daySurveys.length;

      let dailyAvg: number | null = null;
      let star5 = 0;
      let star4 = 0;
      let star3 = 0;
      let star2 = 0;
      let star1 = 0;

      if (count > 0) {
        const sum = daySurveys.reduce((acc, s) => {
          if (s.rating === 5) star5++;
          else if (s.rating === 4) star4++;
          else if (s.rating === 3) star3++;
          else if (s.rating === 2) star2++;
          else if (s.rating === 1) star1++;
          return acc + s.rating;
        }, 0);
        dailyAvg = Number((sum / count).toFixed(2));
        lastKnownRating = dailyAvg;
      }

      points.push({
        dateStr,
        dayLabel,
        fullDayLabel,
        dailyAvg,
        trendRating: count > 0 ? dailyAvg : lastKnownRating,
        count,
        star5,
        star4,
        star3,
        star2,
        star1,
        surveys: daySurveys,
      });
    }

    return points;
  }, [categoryFilteredSurveys]);

  // Aggregate KPI metrics over the 30-day window
  const stats = useMemo(() => {
    const totalCount = trendData.reduce((acc, p) => acc + p.count, 0);
    const daysWithSurveys = trendData.filter((p) => p.count > 0);

    const totalStars = trendData.reduce((acc, p) => {
      const daySum = p.surveys.reduce((sAcc, s) => sAcc + s.rating, 0);
      return acc + daySum;
    }, 0);

    const avg30Days = totalCount > 0 ? (totalStars / totalCount).toFixed(2) : '5.00';
    const numAvg = Number(avg30Days);

    const highSatCount = trendData.reduce(
      (acc, p) => acc + p.star5 + p.star4,
      0
    );
    const satisfactionRate = totalCount > 0 ? Math.round((highSatCount / totalCount) * 100) : 100;

    let targetDiffText = '';
    const diff = numAvg - 4.5;
    if (diff >= 0) {
      targetDiffText = `+${diff.toFixed(2)} di atas standar (4.5★)`;
    } else {
      targetDiffText = `${diff.toFixed(2)} di bawah standar (4.5★)`;
    }

    return {
      totalCount,
      daysWithSurveysCount: daysWithSurveys.length,
      avg30Days,
      numAvg,
      satisfactionRate,
      targetDiffText,
    };
  }, [trendData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayDataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-purple-100 text-slate-800 text-xs min-w-[200px] animate-fadeIn">
          <div className="font-bold text-slate-500 border-b border-slate-100 pb-1 mb-2 flex items-center justify-between">
            <span>{data.fullDayLabel}</span>
            {data.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-black">
                {data.count} Masukan
              </span>
            )}
          </div>

          {data.count > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-600">Rata-rata Rating:</span>
                <span className="font-black text-sm text-purple-900 flex items-center gap-1">
                  <span>{data.dailyAvg?.toFixed(2)}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
              </div>

              <div className="pt-1.5 border-t border-slate-100 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>5 Bintang: {data.star5}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-300" />
                  <span>4 Bintang: {data.star4}</span>
                </div>
                {data.star3 > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-200" />
                    <span>3 Bintang: {data.star3}</span>
                  </div>
                )}
                {data.star2 + data.star1 > 0 && (
                  <div className="flex items-center gap-1 text-rose-500 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>≤ 2 Bintang: {data.star2 + data.star1}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 py-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>Tidak ada masukan masuk pada tanggal ini.</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: 30-Day Average */}
        <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Rata-rata 30 Hari</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-purple-950">
              {stats.avg30Days}
            </span>
            <span className="text-xs font-bold text-slate-400">/ 5.0</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.targetDiffText}</span>
          </div>
        </div>

        {/* KPI 2: Total 30-Day Feedback */}
        <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Total Masukan Masuk</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <MessageSquareHeart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-purple-950">
              {stats.totalCount}
            </span>
            <span className="text-xs font-bold text-slate-400">Ulasan</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 font-medium">
            Tercatat dari {stats.daysWithSurveysCount} hari berbeda
          </p>
        </div>

        {/* KPI 3: Satisfaction Rate */}
        <div className="bg-white p-4 rounded-3xl border border-purple-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Tingkat Kepuasan Tinggi</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-amber-600">
              {stats.satisfactionRate}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 font-medium">
            Persentase penilaian bintang 4 & 5
          </p>
        </div>

        {/* KPI 4: Quality Target */}
        <div className="bg-gradient-to-br from-[#7B58C6] to-[#5934A4] p-4 rounded-3xl text-white shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-purple-100 text-xs font-bold">
            <span>Target Akreditasi RS</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black font-display text-white">4.50 ★</span>
          </div>
          <p className="mt-2 text-[11px] text-purple-100/90 font-medium">
            Standar Pelayanan Prima Mutu Rawat Inap
          </p>
        </div>
      </div>

      {/* 2. MAIN CHART CONTAINER */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-purple-100 shadow-sm space-y-4">
        {/* Chart Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-700" />
              <h3 className="font-display font-black text-base md:text-lg text-slate-900">
                Tren Rata-Rata Bintang 30 Hari Terakhir
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Visualisasi dinamika kepuasan pasien & keluarga di {wardName} ({hospitalName})
            </p>
          </div>

          {/* Interactive Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                <option value="pelayanan_perawat">Keramahan & Kecekatan Perawat</option>
                <option value="kebersihan">Kebersihan Ruangan</option>
                <option value="komunikasi">Komunikasi Medis & Edukasi</option>
                <option value="kecepatan_respon">Respon Bel Panggilan</option>
                <option value="umum">Pelayanan Keseluruhan</option>
              </select>
            </div>

            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  chartType === 'area'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan grafik garis area"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Tren</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                  chartType === 'bar'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan volume masukan harian"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Volume</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. RECHARTS CANVAS */}
        <div className="w-full h-72 md:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRatingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="dayLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={4.5}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Standar Mutu (4.5★)',
                    position: 'insideTopRight',
                    fill: '#059669',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="trendRating"
                  stroke="#7C3AED"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRatingGradient)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (payload.count > 0) {
                      return (
                        <circle
                          key={`dot-${payload.dateStr}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="#F59E0B"
                          stroke="#ffffff"
                          strokeWidth={2}
                          className="animate-pulse"
                        />
                      );
                    }
                    return null;
                  }}
                  activeDot={{
                    r: 7,
                    fill: '#7C3AED',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            ) : (
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="dayLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  fill="#7C3AED"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Legend / Guide */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 rounded-full bg-purple-600" />
              <span>Garis Tren Nilai Rata-Rata</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
              <span>Titik Hari Masukan Masuk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-t border-emerald-500 border-dashed" />
              <span className="text-emerald-700 font-bold">Target Mutu RS (4.5★)</span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400">
            Rentang waktu: 30 hari ke belakang (WITA)
          </span>
        </div>
      </div>

      {/* 4. FOOTER CALLOUT IF FEW REVIEWS */}
      {stats.totalCount < 5 && onOpenSurveyForm && (
        <div className="bg-purple-50/70 border border-purple-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-purple-900 font-medium">
            <MessageSquareHeart className="w-5 h-5 text-purple-700 shrink-0" />
            <span>
              Ingin data tren ruangan semakin akurat dan representatif? Ajak pasien dan keluarga mengisi ulasan rutin.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSurveyForm}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl shadow-xs shrink-0 flex items-center gap-1 transition-all"
          >
            <span>Tulis Penilaian</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
