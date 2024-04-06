import { AppRouter } from "@/trpc";
import { inferRouterOutputs } from "@trpc/server";

type RouterOuput = inferRouterOutputs<AppRouter>;

type Messages = RouterOuput["getFileMessages"]["messages"];

type OmitText = Omit<Messages[number], "text">

type ExtendedText = {
    text: string | JSX.Element
}

export type ExtendedMessage = OmitText & ExtendedText