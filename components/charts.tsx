"use client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardHeader } from "./ui";

const tl = (v: number) => `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(v)} TL`;
const axis = { fontSize: 12, fill: "#6b7a90" };

function Box({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={sub} />
      <div className="h-64 p-3">{children}</div>
    </Card>
  );
}

export interface ChartsData {
  monthlyVolume: { name: string; hacim: number }[];
  dailyCount: { name: string; adet: number }[];
  distribution: { name: string; value: number; color: string }[];
  monthlyCommission: { name: string; komisyon: number }[];
}

export function DashboardCharts({ d, commissionTitle = "Aylık komisyon giderleri" }: { d: ChartsData; commissionTitle?: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Box title="Aylık işlem hacmi" sub="Son 6 ay, iptal/süresi dolanlar hariç">
        <ResponsiveContainer>
          <BarChart data={d.monthlyVolume}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false} />
            <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
            <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}B` : String(v))} width={42} />
            <Tooltip formatter={(v) => tl(Number(v))} cursor={{ fill: "#f5f7fa" }} />
            <Bar dataKey="hacim" name="Hacim" fill="#2864dc" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <Box title="Günlük işlem sayısı" sub="Son 14 gün">
        <ResponsiveContainer>
          <LineChart data={d.dailyCount}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false} />
            <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
            <Tooltip />
            <Line type="monotone" dataKey="adet" name="İşlem" stroke="#16a36a" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <Box title="İşlem durumlarına göre dağılım">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={d.distribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
              {d.distribution.map((e) => <Cell key={e.name} fill={e.color} />)}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      <Box title={commissionTitle} sub="Tamamlanan işlemler üzerinden">
        <ResponsiveContainer>
          <BarChart data={d.monthlyCommission}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e8ef" vertical={false} />
            <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={42} />
            <Tooltip formatter={(v) => tl(Number(v))} cursor={{ fill: "#f5f7fa" }} />
            <Bar dataKey="komisyon" name="Komisyon" fill="#142b4a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </div>
  );
}
