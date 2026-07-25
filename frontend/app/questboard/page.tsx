import Questboard from '@/components/Questboard';

interface PageProps {
  searchParams: { search?: string };
}

export default function QuestboardPage({ searchParams }: PageProps) {
  return <Questboard initialSearch={searchParams.search} />;
}
