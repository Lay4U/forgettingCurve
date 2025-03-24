import { db } from '$lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';

// 과목/분야 추가
export const addSubject = async (userId, subjectData) => {
  try {
    // 예쁜 색상 배열 정의 (파스텔톤과 부드러운 원색)
    const predefinedColors = [
      '#4285F4', // 파란색
      '#34A853', // 녹색
      '#FBBC05', // 노란색
      '#EA4335', // 빨간색
      '#8E44AD', // 보라색
      '#3498DB', // 하늘색
      '#E67E22', // 주황색
      '#1ABC9C', // 청록색
      '#F1C40F', // 밝은 노란색
      '#E74C3C', // 밝은 빨간색
      '#9B59B6', // 밝은 보라색
      '#2ECC71', // 밝은 녹색
      '#16A085', // 다크 민트
      '#27AE60', // 다크 녹색
      '#D35400', // 갈색
      '#2980B9'  // 다크 블루
    ];
    
    // 색상이 지정되지 않은 경우 배열에서 무작위로 선택
    const randomColor = predefinedColors[Math.floor(Math.random() * predefinedColors.length)];
    
    const newSubject = {
      userId,
      name: subjectData.name,
      customIntervals: subjectData.customIntervals || null, // 커스텀 복습 주기
      createdAt: new Date(),
      color: subjectData.color || randomColor
    };
    
    const docRef = await addDoc(collection(db, 'subjects'), newSubject);
    return { id: docRef.id, ...newSubject };
  } catch (error) {
    console.error('과목 추가 에러:', error);
    throw error;
  }
};

// 사용자의 모든 과목/분야 조회
export const getUserSubjects = async (userId) => {
  try {
    const q = query(
      collection(db, 'subjects'),
      where('userId', '==', userId),
      orderBy('name')
    );
    
    const querySnapshot = await getDocs(q);
    const subjects = [];
    
    querySnapshot.forEach((doc) => {
      subjects.push({ id: doc.id, ...doc.data() });
    });
    
    return subjects;
  } catch (error) {
    console.error('사용자 과목 조회 에러:', error);
    throw error;
  }
};

// 특정 과목/분야 조회
export const getSubjectById = async (subjectId) => {
  try {
    const docRef = doc(db, 'subjects', subjectId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('과목 조회 에러:', error);
    throw error;
  }
};

// 과목/분야 업데이트
export const updateSubject = async (subjectId, updateData) => {
  try {
    const subjectRef = doc(db, 'subjects', subjectId);
    await updateDoc(subjectRef, updateData);
    
    const updatedDoc = await getDoc(subjectRef);
    return { id: updatedDoc.id, ...updatedDoc.data() };
  } catch (error) {
    console.error('과목 업데이트 에러:', error);
    throw error;
  }
};

// 과목/분야 삭제
export const deleteSubject = async (subjectId) => {
  try {
    const subjectRef = doc(db, 'subjects', subjectId);
    await deleteDoc(subjectRef);
    return true;
  } catch (error) {
    console.error('과목 삭제 에러:', error);
    throw error;
  }
}; 