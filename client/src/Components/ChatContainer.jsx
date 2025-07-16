import React, { useContext, useEffect, useRef, useState } from 'react'
import assets, { messagesDummyData } from '../assets/assets'
import { formatMessageTime } from '../lib/utils'
import { ChatContext } from '../../context/ChatContext'
import { AuthContext } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ChatContainer = () => {
  // Updated to match the improved context variable names
  const { 
    messages, 
    selectedUser, 
    setSelectedUser, 
    sendMessage, 
    loading 
  } = useContext(ChatContext)

  const { authUser, onlineUsers } = useContext(AuthContext)
  
  const scrollEnd = useRef()
  const [input, setInput] = useState('')
  const [imageLoading, setImageLoading] = useState(false)

  // Handle Sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (input.trim() === "") return null
    
    try {
      await sendMessage({ text: input.trim() })
      setInput("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Handle sending an image
  const handleSendImage = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    // Check file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB")
      return
    }

    const reader = new FileReader()
    setImageLoading(true)

    reader.onloadend = async () => {
      try {
        await sendMessage({ image: reader.result })
        e.target.value = ""
      } catch (error) {
        console.error("Error sending image:", error)
        toast.error("Failed to send image")
      } finally {
        setImageLoading(false)
      }
    }

    reader.onerror = () => {
      toast.error("Error reading file")
      setImageLoading(false)
    }

    reader.readAsDataURL(file)
  }

  // Handle key press for send message
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollEnd.current && messages.length > 0) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Render loading state
  if (loading && (!messages || messages.length === 0)) {
    return (
      <div className='h-full flex items-center justify-center'>
        <div className='text-white text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4'></div>
          <p>Loading messages...</p>
        </div>
      </div>
    )
  }

  return selectedUser ? (
    <div className='h-full overflow-hidden relative backdrop-blur-lg flex flex-col'>
      {/* ----------Header Section ------------ */}
      <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500 flex-shrink-0'>
        <img 
          src={selectedUser.profilePic || assets.avatar_icon} 
          alt="Profile" 
          className="w-8 rounded-full" 
        />
        <p className='flex-1 text-lg text-white flex items-center gap-2'>
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img 
          onClick={() => setSelectedUser(null)} 
          src={assets.arrow_icon} 
          alt="Back" 
          className='md:hidden max-w-7 cursor-pointer hover:opacity-70' 
        />
        <img 
          src={assets.help_icon} 
          alt="Help" 
          className='max-md:hidden max-w-5 cursor-pointer hover:opacity-70' 
        />
      </div>

      {/* ------Chat Area----------- */}
      <div className='flex-1 flex flex-col overflow-y-auto p-3 pb-6'>
        {messages.length === 0 ? (
          <div className='flex-1 flex items-center justify-center text-gray-400'>
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={msg._id || index} 
              className={`flex items-end gap-2 mb-4 ${
                msg.senderId === authUser._id 
                  ? 'flex-row-reverse justify-start' 
                  : 'justify-start'
              }`}
            > 
              {msg.image ? (
                <img 
                  src={msg.image} 
                  alt="Message image" 
                  className='max-w-[230px] border border-gray-700 rounded-lg overflow-hidden cursor-pointer hover:opacity-90' 
                  onClick={() => window.open(msg.image, '_blank')}
                />
              ) : (
                <p className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg
                  break-words bg-violet-500/30 text-white ${
                    msg.senderId === authUser._id 
                      ? 'rounded-br-none' 
                      : 'rounded-bl-none'
                  }`}>
                  {msg.text}
                </p>
              )}
              <div className='text-center text-xs flex-shrink-0'>
                <img 
                  src={
                    msg.senderId === authUser._id 
                      ? authUser?.profilePic || assets.avatar_icon 
                      : selectedUser?.profilePic || assets.avatar_icon
                  } 
                  alt="Avatar" 
                  className='w-7 rounded-full mb-1' 
                />
                <p className='text-gray-500'>
                  {formatMessageTime(msg.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={scrollEnd}></div>
      </div>

      {/* ---- Bottom Area ----  */}
      <div className='flex items-center gap-3 p-3 border-t border-stone-500 flex-shrink-0'>
        <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full'>
          <input 
            onChange={(e) => setInput(e.target.value)} 
            value={input} 
            onKeyDown={handleKeyPress}
            type="text"  
            placeholder='Send a message' 
            className='flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400 bg-transparent'
            disabled={imageLoading}
          />
          <input 
            onChange={handleSendImage} 
            type="file" 
            id='image' 
            accept='image/png, image/jpeg, image/jpg, image/gif' 
            hidden 
            disabled={imageLoading}
          />
          <label htmlFor="image" className={imageLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}>
            <img 
              src={assets.gallery_icon} 
              alt="Attach image" 
              className='w-5 mr-2 hover:opacity-70' 
            />
          </label>
        </div>
        <button
          onClick={handleSendMessage}
          disabled={input.trim() === '' || imageLoading}
          className={`p-1 rounded-full transition-opacity ${
            input.trim() === '' || imageLoading 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:opacity-70 cursor-pointer'
          }`}
        >
          <img 
            src={assets.send_button} 
            alt="Send" 
            className="w-7"
          />
        </button>
      </div>
    </div>
  ) : (
    <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden h-full'>
      <img src={assets.logo_icon} className='max-w-16' alt="Logo" />
      <p className='text-lg font-medium text-white'>Chat anytime, anywhere</p>
    </div>
  )
}

export default ChatContainer