'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface ExamAnswer {
  questionId: string;
  selectedOptionId?: string;
}

export interface ExamState {
  sessionId?: string;
  studentName: string;
  schoolId: string;
  grade: number;
  examId: string;
  currentQuestionIndex: number;
  answers: ExamAnswer[];
  isCompleted: boolean;
  startedAt: number;
  lastSaved?: number;
}

const INITIAL_STATE: ExamState = {
  studentName: '',
  schoolId: '',
  grade: 1,
  examId: '',
  currentQuestionIndex: 0,
  answers: [],
  isCompleted: false,
  startedAt: Date.now(),
};

export function useExam(examId: string) {
  const { storedValue: examState, setValue: setExamState, removeValue: clearExamState, isInitialized } = useLocalStorage<ExamState>(
    `exam_${examId}`,
    INITIAL_STATE
  );
  const [isSaving, setIsSaving] = useState(false);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateAnswer = useCallback(
    (questionId: string, optionId: string) => {
      setExamState((prev) => ({
        ...prev,
        answers: prev.answers.some((a) => a.questionId === questionId)
          ? prev.answers.map((a) =>
              a.questionId === questionId ? { ...a, selectedOptionId: optionId } : a
            )
          : [...prev.answers, { questionId, selectedOptionId: optionId }],
        lastSaved: Date.now(),
      }));
    },
    [setExamState]
  );

  const nextQuestion = useCallback(() => {
    setExamState((prev) => ({
      ...prev,
      currentQuestionIndex: prev.currentQuestionIndex + 1,
    }));
  }, [setExamState]);

  const prevQuestion = useCallback(() => {
    setExamState((prev) => ({
      ...prev,
      currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1),
    }));
  }, [setExamState]);

  const goToQuestion = useCallback(
    (index: number) => {
      setExamState((prev) => ({
        ...prev,
        currentQuestionIndex: index,
      }));
    },
    [setExamState]
  );

  const markCompleted = useCallback(() => {
    setExamState((prev) => ({
      ...prev,
      isCompleted: true,
    }));
  }, [setExamState]);

  const setSessionId = useCallback(
    (sessionId: string) => {
      setExamState((prev) => ({
        ...prev,
        sessionId,
      }));
    },
    [setExamState]
  );

  const setStudentInfo = useCallback(
    (name: string, schoolId: string, grade: number) => {
      setExamState((prev) => ({
        ...prev,
        studentName: name,
        schoolId,
        grade,
        examId,
        startedAt: Date.now(),
      }));
    },
    [setExamState, examId]
  );

  const resetExam = useCallback(() => {
    clearExamState();
    setExamState({
      ...INITIAL_STATE,
      examId,
      startedAt: Date.now(),
    });
  }, [clearExamState, setExamState, examId]);

  const getAnsweredCount = useCallback(() => {
    return examState.answers.filter((a) => a.selectedOptionId).length;
  }, [examState.answers]);

  const hasAnsweredQuestion = useCallback(
    (questionId: string) => {
      return examState.answers.some(
        (a) => a.questionId === questionId && a.selectedOptionId
      );
    },
    [examState.answers]
  );

  const getAnswerForQuestion = useCallback(
    (questionId: string) => {
      return examState.answers.find((a) => a.questionId === questionId);
    },
    [examState.answers]
  );

  return {
    examState,
    isSaving,
    updateAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    markCompleted,
    setSessionId,
    setStudentInfo,
    resetExam,
    getAnsweredCount,
    hasAnsweredQuestion,
    getAnswerForQuestion,
  };
}
