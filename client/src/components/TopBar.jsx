import React from "react";
import {
    getCurrentWindow,
    getCurrentVersion
} from '../utils/electron';

import { IoClose, IoRemove, IoCopyOutline, IoSquareOutline } from 'react-icons/io5'

export default class Topbar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isMax: this.isWindowMaximized()
        }
    }
    
    minimizeWindow() {
        if (getCurrentWindow().minimizable) {
            getCurrentWindow().minimize();
            this.setState({isMax: false});
        }
    }
    
    maximizeWindow() {
        if (getCurrentWindow().maximizable) {
            getCurrentWindow().maximize();
            this.setState({isMax: true});
        }
    }
    
    unmaximizeWindow() {
        getCurrentWindow().unmaximize();
        this.setState({isMax: false});
    }
    
    maxUnmaxWindow() {
        if (getCurrentWindow().isMaximized()) {
            getCurrentWindow().unmaximize();
            this.setState({isMax: false});
        } else {
            getCurrentWindow().maximize();
            this.setState({isMax: true});
        }
    }
    
    closeWindow() {
        getCurrentWindow().close();
    }
    
    isWindowMaximized() {
        return getCurrentWindow().isMaximized();
    }

    onResize() {
        this.setState({isMax: getCurrentWindow().isMaximized()})
    }

    componentDidMount() {
        getCurrentWindow().on('resize', this.onResize.bind(this));
    }

    componentWillUnmount() {
        getCurrentWindow().removeListener('resize', this.onResize.bind(this));
    }

    render(){
        return(
            <>
                {window.require("electron") ? 
                <div className={'flex bg-gray-800 h-6 justify-between align-center'} style={{WebkitAppRegion: 'drag', WebkitUserSelect: 'none'}}>
                    <h1 className={'text-white ml-2 font-semibold'}>Synko v{getCurrentVersion()}</h1>
                    <ul className={'flex p-0'}>
                        <li className={'flex items-center h-full px-4 text-white text-md hover:bg-gray-750 cursor-pointer bg-opacity-50'} style={{WebkitAppRegion: 'no-drag'}} onClick={this.minimizeWindow.bind(this)}><IoRemove/></li>
                        <li className={'flex items-center h-full px-4 text-white text-sm hover:bg-gray-750 cursor-pointer bg-opacity-50'} style={{WebkitAppRegion: 'no-drag'}} onClick={this.maxUnmaxWindow.bind(this)}>{this.isWindowMaximized() ? <IoCopyOutline/> : <IoSquareOutline/>}</li>
                        <li className={'flex items-center h-full px-4 text-white text-md hover:bg-red-500 cursor-pointer bg-opacity-50'} style={{WebkitAppRegion: 'no-drag'}} onClick={this.closeWindow.bind(this)}><IoClose/></li>
                    </ul>
                </div>
                : <></>}
            </>
        )
    }
}