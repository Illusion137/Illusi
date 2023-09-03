import { current } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';

const initialState = {
  current: [],
};
 
export default (state = initialState, action) => {
  switch (action.type) {
    case 'ADD_TRACK':
      return {
        ...state,
        current: current.push(state),
      };
    case 'COUNT_DECRESE':
      return {
        ...state,
        count: state.count - 1,
      };
    default:
      return state;
  }
};
