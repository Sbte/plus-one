import React from 'react';
import GoBack from './GoBack';
import configureMockStore from 'redux-mock-store';
import { MemoryRouter } from 'react-router-dom';
import { mount } from 'enzyme';
import { TYPES } from './../actions';
import { push, goBack } from 'react-router-redux';
import thunk from 'redux-thunk';

describe('<GoBack />', () => {
  it('renders', () => {
    const mockStore = configureMockStore([thunk]);

    const store = mockStore({ queuedOrder: null });
    const goback = mount(
      <MemoryRouter initialEntries={['/products']}>
        <GoBack store={store} />
      </MemoryRouter>
    );

    goback.find('button').simulate('click');

    expect(store.getActions()).toEqual([goBack(), { type: TYPES.GO_BACK }]);
  });

  it('goes back to a previous customer', () => {
    const mockStore = configureMockStore([thunk]);

    const member = {
      id: 1,
      firstName: 'John',
      surname: 'Snow',
      age: 18,
      prominent: null,
      cosmetics: {
        color: null,
        image: null,
        nickname: null,
        button: {
          width: null,
          height: null
        }
      }
    };
    const store = mockStore({
      queuedOrder: {
        ordered_at: 1,
        order: {
          member: member,
          products: []
        }
      }
    });
    const goback = mount(
      <MemoryRouter>
        <GoBack store={store} />
      </MemoryRouter>
    );

    goback.find('button').simulate('click');

    expect(store.getActions()).toEqual([
      push('/products'),
      { type: TYPES.SELECT_MEMBER, member }
    ]);
  });
});
