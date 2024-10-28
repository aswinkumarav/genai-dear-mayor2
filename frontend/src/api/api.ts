import { UserInfo, ConversationRequest, Conversation, ChatMessage, CosmosDBHealth, CosmosDBStatus } from "./models";
import { chatHistorySampleData } from "../constants/chatHistory";

export async function conversationApi(options: ConversationRequest, abortSignal: AbortSignal): Promise<Response> {
    const containerName = getUseCaseName();
    const response = await fetch("/conversation", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messages: options.messages,
            containerName,
            indexName: containerName
        }),
        signal: abortSignal
    });

    return response;
}

export async function getUserInfo(): Promise<UserInfo[]> {
    const response = await fetch('/.auth/me');
    if (!response.ok) {
        console.log("No identity provider found. Access to chat will be blocked.")
        return [];
    }

    const payload = await response.json();
    return payload;
}

// export const fetchChatHistoryInit = async (): Promise<Conversation[] | null> => {
export const fetchChatHistoryInit = (): Conversation[] | null => {
    // Make initial API call here

    // return null;
    return chatHistorySampleData;
}

export const historyList = async (offset=0): Promise<Conversation[] | null> => {
    const containerName = getUseCaseName();
    const response = await fetch(`/history/list?offset=${offset}&containerName=${containerName}`, {
        method: "GET",
    }).then(async (res) => {
        const payload = await res.json();
        if (!Array.isArray(payload)) {
            console.error("There was an issue fetching your data.");
            return null;
        }
        const conversations: Conversation[] = await Promise.all(payload.map(async (conv: any) => {
            let convMessages: ChatMessage[] = [];
            convMessages = await historyRead(conv.id)
            .then((res) => {
                return res
            })
            .catch((err) => {
                console.error("error fetching messages: ", err)
                return []
            })
            const conversation: Conversation = {
                id: conv.id,
                title: conv.title,
                date: conv.createdAt,
                messages: convMessages
            };
            return conversation;
        }));
        return conversations;
    }).catch((err) => {
        console.error("There was an issue fetching your data.");
        return null
    })

    return response
}

export const historyRead = async (convId: string): Promise<ChatMessage[]> => {
    const containerName = getUseCaseName();
    const response = await fetch("/history/read", {
        method: "POST",
        body: JSON.stringify({
            conversation_id: convId,
            containerName
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then(async (res) => {
        if(!res){
            return []
        }
        const payload = await res.json();
        let messages: ChatMessage[] = [];
        if(payload?.messages){
            payload.messages.forEach((msg: any) => {
                const message: ChatMessage = {
                    id: msg.id,
                    role: msg.role,
                    date: msg.createdAt,
                    content: msg.content,
                    feedback: msg.feedback ?? undefined
                }
                messages.push(message)
            });
        }
        return messages;
    }).catch((err) => {
        console.error("There was an issue fetching your data.");
        return []
    })
    return response
}

export const historyGenerate = async (options: ConversationRequest, abortSignal: AbortSignal, convId?: string): Promise<Response> => {
    let body;
    const containerName = getUseCaseName();
    if(convId){
        body = JSON.stringify({
            conversation_id: convId,
            messages: options.messages,
            containerName,
            indexName: containerName
        })
    }else{
        body = JSON.stringify({
            messages: options.messages,
            containerName,
            indexName: containerName
        })
    }
    const response = await fetch("/history/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: body,
        signal: abortSignal
    }).then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        return new Response;
    })
    return response
}

export const historyUpdate = async (messages: ChatMessage[], convId: string): Promise<Response> => {
    const containerName = getUseCaseName();
    const response = await fetch("/history/update", {
        method: "POST",
        body: JSON.stringify({
            conversation_id: convId,
            messages: messages,
            containerName
        }),
        headers: {
            "Content-Type": "application/json"
        },
    }).then(async (res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response
}

export const historyDelete = async (convId: string) : Promise<Response> => {
    const containerName = getUseCaseName();
    const response = await fetch("/history/delete", {
        method: "DELETE",
        body: JSON.stringify({
            conversation_id: convId,
            containerName
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyDeleteAll = async () : Promise<Response> => {
    const containerName = getUseCaseName();
    const response = await fetch("/history/delete_all", {
        method: "DELETE",
        body: JSON.stringify({
            containerName
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyClear = async (convId: string) : Promise<Response> => {
    const containerName = getUseCaseName();
    const response = await fetch("/history/clear", {
        method: "POST",
        body: JSON.stringify({
            conversation_id: convId,
            containerName
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyRename = async (convId: string, title: string) : Promise<Response> => {
    const containerName = getUseCaseName();
    const response = await fetch("/history/rename", {
        method: "POST",
        body: JSON.stringify({
            conversation_id: convId,
            title: title,
            containerName
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const historyEnsure = async (): Promise<CosmosDBHealth> => {
    const containerName = getUseCaseName();
    const response = await fetch(`/history/ensure?containerName=${containerName}`, {
        method: "GET",
    })
    .then(async res => {
        let respJson = await res.json();
        let formattedResponse;
        if(respJson.message){
            formattedResponse = CosmosDBStatus.Working
        }else{
            if(res.status === 500){
                formattedResponse = CosmosDBStatus.NotWorking
            }else if(res.status === 401){
                formattedResponse = CosmosDBStatus.InvalidCredentials    
            }else if(res.status === 422){ 
                formattedResponse = respJson.error    
            }else{
                formattedResponse = CosmosDBStatus.NotConfigured
            }
        }
        if(!res.ok){
            return {
                cosmosDB: false,
                status: formattedResponse
            }
        }else{
            return {
                cosmosDB: true,
                status: formattedResponse
            }
        }
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        return {
            cosmosDB: false,
            status: err
        }
    })
    return response;
}

export const frontendSettings = async (): Promise<Response | null> => {
    const response = await fetch("/frontend_settings", {
        method: "GET",
    }).then((res) => {
        return res.json()
    }).catch((err) => {
        console.error("There was an issue fetching your data.");
        return null
    })

    return response
}
export const historyMessageFeedback = async (messageId: string, feedback: string): Promise<Response> => {
    const containerName = getUseCaseName();
    const response = await fetch("/history/message_feedback", {
        method: "POST",
        body: JSON.stringify({
            message_id: messageId,
            message_feedback: feedback,
            containerName
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res
    })
    .catch((err) => {
        console.error("There was an issue logging feedback.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}

export const getUseCaseList = async (userId: string): Promise<Response | null> => {
    const response = await fetch(`/useCase/name_list?user=${userId}`, {
        method: "GET",
    }).then((res) => {
        return res.json()
    }).catch((err) => {
        console.error("There was an issue fetching the data.");
        return null
    })

    return response
}

function getUseCaseName() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const usecase = urlParams.get('usecase');

    return usecase?.toLocaleLowerCase();
}

export const getBlobUrl = async (filepath: string): Promise<Response | null> => {
    const response = await fetch("/get_pdf_sas_url", {
        method: "POST",
        body: JSON.stringify({
            blob_name: filepath
        }),
        headers: {
            "Content-Type": "application/json"
        },
    })
    .then((res) => {
        return res.json()
    })
    .catch((err) => {
        console.error("There was an issue fetching your data.");
        let errRes: Response = {
            ...new Response,
            ok: false,
            status: 500,
        }
        return errRes;
    })
    return response;
}