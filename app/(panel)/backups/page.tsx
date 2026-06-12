export default function BackupsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Backups</h1>
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
        <p className="text-4xl">💾</p>
        <p className="mt-3 font-medium text-text">Segera hadir (Phase 3)</p>
        <p className="mt-1 text-sm">
          Auto backup harian (pg_dump → MinIO/S3) dengan retensi 7 hari.
        </p>
      </div>
    </div>
  );
}
