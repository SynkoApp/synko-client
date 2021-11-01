import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './animate.css';
import {
  HashRouter as Router,
  Route
} from "react-router-dom";
import Dm from './pages/Dm';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home'
import Topbar from './components/TopBar'
import Notifications from './components/Notifications';
import Settings from './pages/Settings'
import ForgotPassword from './pages/ForgotPassword'
import { ipcRenderer } from './utils/electron';

ipcRenderer.on('notification', (evt, text) => {
  console.log(evt)
})

ReactDOM.render(
    <Router>
        <Topbar key={Math.floor(Math.random() * Date.now())}/>
        <Notifications/>
        <Route path="/dm/:id" render={(props) => <Dm {...props} key={Math.floor(Math.random() * Date.now())} />}/>
        <Route exact path="/login" component={Login}/>
        <Route exact path="/register" component={Register}/>
        <Route exact path="/settings" component={Settings}/>
        <Route exact path="/forgotPassword" component={ForgotPassword}/>
        <Route exact path="/" component={Home}/>
    </Router>,
  document.querySelector('synko')
);