
import axios from 'axios';
import { Brain } from '../classes/Brain';
// not in use right now but a start to be called when the application starts to fill in the active brains and the actions we will uses


export const fetchBrains = () => async (dispatch) => {
    try {
        const response = await axios.get('https://api.example.com/brains');
        const data = response.data;

        const brains = data.map(dir => new Brain(dir.name, `https://api.example.com/brains/${dir.name}`));
        // add the bucket api as the main url here, pull from somewhere else idk

        dispatch({
            type: 'FETCH_BRAINS_SUCCESS',
            payload: brains
        });
    } catch (error) {
        dispatch({
            type: 'FETCH_BRAINS_ERROR',
            payload: error.message
        });
    }
};
