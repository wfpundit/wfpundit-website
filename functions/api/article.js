
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0b1220">
<meta name="description" content="Read the latest women's football news from WF Pundit.">
<title>WF Pundit | Article</title>

<style>
:root{
--bg:#0b1220;
--panel:#131e2e;
--line:#2a3a50;
--text:#f5f7fb;
--muted:#aab6c7;
--cyan:#9fc5ed;
}
*{box-sizing:border-box}
body{
margin:0;
background:var(--bg);
color:var(--text);
font-family:Inter,system-ui,sans-serif;
line-height:1.7
}
a{color:inherit;text-decoration:none}
.wrap{width:min(850px,calc(100% - 32px));margin:auto}
header{
border-bottom:1px solid var(--line);
background:#0d1727;
padding:18px 0
}
.brand{font-size:23px;font-weight:950;letter-spacing:-1px}
.verified{
display:inline-grid;
place-items:center;
width:16px;
height:16px;
border-radius:50%;
background:#1689ff;
color:white;
font-size:10px
}
main{padding:35px 0 60px}
.back{
display:inline-block;
color:var(--cyan);
font-size:12px;
font-weight:800;
margin-bottom:25px
}
.article{
background:var(--panel);
border:1px solid var(--line);
border-radius:13px;
overflow:hidden
}
.article-image{
width:100%;
max-height:470px;
object-fit:cover;
display:none
}
.article-content{padding:28px}
.category{
color:var(--cyan);
font-size:11px;
font-weight:900;
text-transform:uppercase;
letter-spacing:.1em
}
h1{
font-size:clamp(27px,5vw,43px);
line-height:1.15;
letter-spacing:-1px;
margin:12px 0
}
.summary{color:#c4d0df;font-size:16px;margin:0 0 18px}
.meta{
color:#8798ad;
font-size:11px;
margin-bottom:24px;
border-bottom:1px solid var(--line);
padding-bottom:18px
}
.content{
color:#e0e6ef;
font-size:15px;
white-space:pre-wrap;
overflow-wrap:anywhere
}
.message{text-align:center;color:var(--muted);padding:40px 15px}
.save-area{margin:18px 0 24px}
.save-button,.comment-button{
padding:11px 18px;
border:0;
border-radius:8px;
background:#3978c8;
color:white;
font-weight:800;
cursor:pointer
}
.save-button:disabled,.comment-button:disabled{
opacity:.6;
cursor:not-allowed
}
.save-message,.comment-message{
font-size:13px;
color:var(--muted);
margin:8px 0 0
}
.comments{
margin-top:35px;
padding-top:25px;
border-top:1px solid var(--line)
}
.comments h2{font-size:22px;margin:0 0 18px}
.comment-form textarea{
width:100%;
min-height:110px;
resize:vertical;
padding:13px;
border:1px solid var(--line);
border-radius:8px;
background:var(--bg);
color:var(--text);
font:inherit;
outline:none
}
.comment-form textarea:focus{border-color:var(--cyan)}
.comment-form textarea::placeholder{color:var(--muted)}
.comment-login{
color:var(--muted);
font-size:13px;
margin:0 0 12px
}
.comment-login a{color:var(--cyan);font-weight:800}
.comment-button{margin-top:12px}
.comment-list{margin-top:25px}
.comment-item{
padding:15px 0;
border-bottom:1px solid var(--line)
}
.comment-author{font-weight:850;font-size:14px}
.comment-date{color:var(--muted);font-size:11px}
.comment-text{
font-size:14px;
white-space:pre-wrap;
overflow-wrap:anywhere;
margin-top:7px
}
footer{
border-top:1px solid var(--line);
padding:25px 0;
color:var(--muted);
font-size:11px;
text-align:center
}
body.light-mode{
--bg:#f1f4f8;
--panel:#fff;
--line:#dce3ec;
--text:#1c2939;
--muted:#66758a
}
body.light-mode header{background:#fff}
body.light-mode .summary,
body.light-mode .content{color:#34445a}
@media(max-width:600px){
.article-content{padding:19px}
main{padding-top:24px}
}
</style>
</head>

<body>
<header>
<div class="wrap">
<a class="brand" href="/index.html">wf_pundit <span class="verified">✓</span></a>
</div>
</header>

<main class="wrap">
<a class="back" href="/index.html#latest">← Back to latest news</a>

<div id="message" class="message">Loading article...</div>

<article class="article" id="article" hidden>
<img class="article-image" id="articleImage" alt="">

<div class="article-content">
<div class="category" id="category"></div>
<h1 id="title"></h1>
<p class="summary" id="summary"></p>
<div class="meta" id="meta"></div>

<div class="save-area">
<button class="save-button" id="saveButton" type="button">
♡ Save Article
</button>
<p class="save-message" id="saveMessage"></p>
</div>

<div class="content" id="content"></div>

<section class="comments" id="comments">
<h2>Comments</h2>

<p class="comment-login" id="commentLogin">
Please <a href="/account.html">log in</a> to leave a comment.
</p>

<form class="comment-form" id="commentForm">
<textarea
id="commentInput"
maxlength="2000"
placeholder="Write your comment..."
required
></textarea>

<button class="comment-button" id="commentButton" type="submit">
POST COMMENT
</button>

<p class="comment-message" id="commentMessage"></p>
</form>

<div class="comment-list" id="commentList">
<p class="message">Loading comments...</p>
</div>
</section>

</div>
</article>
</main>

<footer>
<div class="wrap">
© <span id="year"></span> WF Pundit · Women's football. Every story matters.
</div>
</footer>

<script>
document.getElementById("year").textContent=new Date().getFullYear();

try{
if(localStorage.getItem("wf-theme")==="light"){
document.body.classList.add("light-mode");
}
}catch(error){}

let currentArticleId=null;

async function loadArticle(){
const message=document.getElementById("message");
const articleElement=document.getElementById("article");
const id=new URLSearchParams(window.location.search).get("id");

if(!id||!/^\d+$/.test(id)){
message.textContent="This article link is invalid.";
return;
}

try{
const response=await fetch("/api/article?id="+encodeURIComponent(id));
const data=await response.json();

if(!response.ok||!data.success||!data.article){
throw new Error(data.error||"Article not found.");
}

const article=data.article;
currentArticleId=Number(article.id);

document.title=(article.title||"Article")+" | WF Pundit";
document.getElementById("title").textContent=article.title||"";
document.getElementById("summary").textContent=article.summary||"";
document.getElementById("category").textContent=article.category||"Women's Football";
document.getElementById("content").textContent=article.content||"";

const author=article.author||"WF Pundit";
const date=article.created_at
?new Date(article.created_at).toLocaleDateString("en-GB",{
day:"numeric",
month:"long",
year:"numeric"
})
:"";

document.getElementById("meta").textContent=
"By "+author+(date?" · "+date:"");

const image=document.getElementById("articleImage");

if(article.image_url&&/^https:\/\//i.test(article.image_url)){
image.src=article.image_url;
image.alt=article.title||"Article image";
image.style.display="block";
}

message.hidden=true;
articleElement.hidden=false;

await loadComments();

}catch(error){
console.error("Article loading error:",error);
message.textContent=error.message||"Unable to load this article. Please try again.";
}
}

async function loadComments(){
const commentList=document.getElementById("commentList");

if(!currentArticleId)return;

commentList.textContent="Loading comments...";

try{
const response=await fetch(
"/api/comments?articleId="+encodeURIComponent(currentArticleId)
);

const data=await response.json();

if(!response.ok||!data.success){
throw new Error(data.error||"Unable to load comments.");
}

commentList.replaceChildren();

if(!data.comments||data.comments.length===0){
const empty=document.createElement("p");
empty.className="message";
empty.textContent="No comments yet. Be the first to comment.";
commentList.appendChild(empty);
return;
}

data.comments.forEach(comment=>{
const item=document.createElement("div");
item.className="comment-item";

const author=document.createElement("div");
author.className="comment-author";
author.textContent=comment.display_name||"Reader";

const date=document.createElement("div");
date.className="comment-date";

if(comment.created_at){
const parsedDate=new Date(comment.created_at);
date.textContent=Number.isNaN(parsedDate.getTime())
?""
:parsedDate.toLocaleString();
}

const content=document.createElement("div");
content.className="comment-text";
content.textContent=comment.comment||"";

item.append(author,date,content);
commentList.appendChild(item);
});

}catch(error){
console.error("Comments loading error:",error);
commentList.textContent=error.message||"Unable to load comments.";
}
}

document.getElementById("saveButton").addEventListener("click",async function(){
const button=this;
const saveMessage=document.getElementById("saveMessage");

if(!currentArticleId){
saveMessage.textContent="Article is not ready yet.";
return;
}

button.disabled=true;
button.textContent="Saving...";
saveMessage.textContent="";

try{
const response=await fetch("/api/saved",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({articleId:currentArticleId})
});

const data=await response.json();

if(!response.ok||!data.success){
throw new Error(data.error||"Unable to save article.");
}

button.textContent="✓ Saved";
saveMessage.textContent="Article saved to your account.";

}catch(error){
button.textContent="♡ Save Article";
saveMessage.textContent=error.message||"Something went wrong.";
}finally{
button.disabled=false;
}
});

document.getElementById("commentForm").addEventListener("submit",async function(event){
event.preventDefault();

const input=document.getElementById("commentInput");
const button=document.getElementById("commentButton");
const message=document.getElementById("commentMessage");
const comment=input.value.trim();

if(!currentArticleId){
message.textContent="Article is not ready yet.";
return;
}

if(!comment){
message.textContent="Please write a comment first.";
return;
}

if(comment.length>2000){
message.textContent="Your comment is too long.";
return;
}

button.disabled=true;
button.textContent="POSTING...";
message.textContent="";

try{
const response=await fetch("/api/comments",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
articleId:currentArticleId,
comment:comment
})
});

const data=await response.json();

if(!response.ok||!data.success){
throw new Error(data.error||"Unable to publish your comment.");
}

input.value="";
message.textContent=data.message||"Your comment has been published.";

await loadComments();

}catch(error){
message.textContent=error.message||"Something went wrong. Please try again.";
}finally{
button.disabled=false;
button.textContent="POST COMMENT";
}
});

loadArticle();
</script>
</body>
</html>
