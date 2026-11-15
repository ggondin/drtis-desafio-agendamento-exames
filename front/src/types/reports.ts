export type ReportStatus = "draft" | "published";

export type ReportContent = {
  title: string;
  content: string;
  professional: string;
};

export type Report = ReportContent & {
  id: number;
  status: ReportStatus;
  publishedAt: string | null;
};
