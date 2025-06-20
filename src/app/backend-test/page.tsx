import BackendConnectionTest from '@/components/BackendConnectionTest';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function BackendTestPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Backend Connection Test</h1>
        <BackendConnectionTest />
      </div>
    </ProtectedRoute>
  );
} 