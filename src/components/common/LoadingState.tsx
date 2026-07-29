interface LoadingStateProps {
  label?: string;
}

export default function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
