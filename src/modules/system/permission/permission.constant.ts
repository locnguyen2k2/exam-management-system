import { registerEnumType } from '@nestjs/graphql';

export enum PermissionEnum {
  //Roles
  LIST_ROLE = 'list_role',
  DETAIL_ROLE = 'detail_role',
  ADD_ROLE = 'add_role',
  UPDATE_ROLE = 'update_role',
  DELETE_ROLE = 'delete_role',
  //Permission
  LIST_PERMISSION = 'list_permission',
  DETAIL_PERMISSION = 'detail_permission',
  ADD_PERMISSION = 'add_permission',
  UPDATE_PERMISSION = 'update_permission',
  DELETE_PERMISSION = 'delete_permission',
  // Account
  DETAIL_ACCOUNT = 'detail_account',
  UPDATE_ACCOUNT = 'update_account',
  DELETE_ACCOUNT = 'delete_account',
  DISABLE_ACCOUNT = 'disable_account',
  //Users
  LIST_USER = 'list_user',
  DETAIL_USER = 'detail_user',
  ADD_USER = 'add_user',
  UPDATE_USER = 'update_user',
  DELETE_USER = 'delete_user',
  //Answers
  LIST_ANSWER = 'list_answer',
  DETAIL_ANSWER = 'detail_answer',
  ADD_ANSWER = 'add_answer',
  UPDATE_ANSWER = 'update_answer',
  DELETE_ANSWER = 'delete_answer',
  //Chapters
  LIST_CHAPTER = 'list_chapter',
  DETAIL_CHAPTER = 'detail_chapter',
  MY_CHAPTER = 'my_chapter',
  ADD_CHAPTER = 'add_chapter',
  UPDATE_CHAPTER = 'update_chapter',
  DELETE_CHAPTER = 'delete_chapter',
  //Questions
  LIST_QUESTION = 'list_question',
  DETAIL_QUESTION = 'detail_question',
  ADD_QUESTION = 'add_question',
  UPDATE_QUESTION = 'update_question',
  DELETE_QUESTION = 'delete_question',
  //Exams
  LIST_EXAM = 'list_exam',
  DETAIL_EXAM = 'detail_exam',
  ADD_EXAM = 'add_exam',
  UPDATE_EXAM = 'update_exam',
  DELETE_EXAM = 'delete_exam',
  //Lessons
  LIST_LESSON = 'list_lesson',
  DETAIL_LESSON = 'detail_lesson',
  ADD_LESSON = 'add_lesson',
  UPDATE_LESSON = 'update_lesson',
  DELETE_LESSON = 'delete_lesson',
}

registerEnumType(PermissionEnum, { name: 'PermissionEnum' });
