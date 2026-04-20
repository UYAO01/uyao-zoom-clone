import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/components/ui/firebase';

export const useIsEmployee = () => {
  const { user } = useUser();
  const [isEmployee, setIsEmployee] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setIsEmployee(false);
      return;
    }

    const q = query(
      collection(db, 'job_applications'),
      where('applicantId', '==', user.id),
      where('isAccepted', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsEmployee(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user?.id]);

  return isEmployee;
};