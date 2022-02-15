import React from 'react'
import { API_URL } from '../utils/APIBase'

export default class Embed extends React.Component {
    constructor(props){
        super(props)
    }

    render(){
        let links = this.props.links
        return(
            <div className={'max-w-full'}>
                {links.map(l => 
                    <a href={l.site} target='_blank' rel='noreferrer' style={{maxWidth: "500px"}} key={Date.now()*Math.random()} className={'flex cursor-pointer justify-center sm:flex-row flex-col w-full sm:w-max my-2'}>
                        <div style={{borderLeft: `solid 3px ${l['theme-color'] ? l['theme-color'] : "#3b82f6"}`}} className={'w-full rounded-md flex flex-col bg-gray-750'}>
                            <div className={'p-4'}>
                                <div className={'flex-col'}>
                                    <h3 className={'font-semibold text-xl flex items-center text-white'}>
                                        {l.icon ? 
                                            <img src={API_URL+'/proxy/i?url='+new URL(l.icon, "https://"+l.domain)} className={'w-5 h-5 mr-2 align-middle'}/>
                                        : ""}{l.title ? l.title : ""}
                                    </h3>
                                    <p className={'text-gray-400'}>{l.description ? l.description : ""}</p>
                                    {l.image ? <img style={{maxWidth: "100%"}} src={l.image}/> : ""}
                                </div>
                            </div>
                        </div>
                    </a>
                )}
            </div>
        )
    }
}