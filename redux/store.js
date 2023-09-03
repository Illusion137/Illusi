import { createStore, combineReducers} from 'redux';
import tracksReducer from './tracksReducer';
 
const rootReducer = combineReducers({
  tracks: tracksReducer,
});
 
export const store = createStore(rootReducer);